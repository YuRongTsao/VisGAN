import numpy as np
import tensorflow as tf
import random
import time
from util import *
from dataloader import Gen_Data_loader, Dis_dataloader
from generator import Generator
from discriminator import Discriminator
from rollout import ROLLOUT
from target_lstm import TARGET_LSTM


#########################################################################################
#  Generator  Hyper-parameters
######################################################################################
EMB_DIM = 32 # embedding dimension
HIDDEN_DIM = 32 # hidden state dimension of lstm cell
SEQ_LENGTH = 20 # sequence length
START_TOKEN = 0
PRE_GEN_EPOCH_NUM = 2 #120 # supervise (maximum likelihood estimation) epochs。pretrain的epoch數
SEED = 88
BATCH_SIZE = 64

#########################################################################################
#  Discriminator  Hyper-parameters
#########################################################################################
dis_embedding_dim = 64
dis_filter_sizes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20]
dis_num_filters = [100, 200, 200, 200, 200, 100, 100, 100, 100, 100, 160, 160]
dis_dropout_keep_prob = 0.75
dis_l2_reg_lambda = 0.2
dis_batch_size = 64
PRE_DIS_EPOCH_NUM = 1 #50 

#########################################################################################
#  Basic Training Parameters
#########################################################################################
TOTAL_BATCH = 1 #200
positive_file = '..//data//training_data//positive.txt' #input file
negative_file = '..//data//training_data//generator_sample.txt' #output file
generate_file = '..//data//generated_data//generate.txt' #output file
eval_file = '..//data//training_data//data/eval_file.txt' # did not used in this experiment
generated_num = 10000
test_num = 1000
vocab_size = 14 #有幾個不一樣的text 
num_classes = 2
ADV_GEN_TIME = 1

def main():
    random.seed(SEED)
    np.random.seed(SEED)
    assert START_TOKEN == 0

    gen_data_loader = Gen_Data_loader(BATCH_SIZE)
    likelihood_data_loader = Gen_Data_loader(BATCH_SIZE) # For testing
    dis_data_loader = Dis_dataloader(BATCH_SIZE)

    generator = Generator(vocab_size, BATCH_SIZE, EMB_DIM, HIDDEN_DIM, SEQ_LENGTH, START_TOKEN)
    discriminator = Discriminator(sequence_length=SEQ_LENGTH, num_classes=num_classes, vocab_size=vocab_size, embedding_size=dis_embedding_dim, 
                                filter_sizes=dis_filter_sizes, num_filters=dis_num_filters, l2_reg_lambda=dis_l2_reg_lambda)
    #target_params = cPickle.load(open('save/target_params.pkl'))
    #target_lstm = TARGET_LSTM(vocab_size, BATCH_SIZE, EMB_DIM, HIDDEN_DIM, SEQ_LENGTH, START_TOKEN, target_params) # The oracle model

    # avoid occupy all the memory if the GPU
    config = tf.ConfigProto()
    config.gpu_options.allow_growth = True
    sess = tf.Session(config=config)
    sess.run(tf.global_variables_initializer())

    #Savers 
    saver_gen = tf.train.Saver()
    saver_dis = tf.train.Saver()
    saver_seqgan = tf.train.Saver()

    # First, use the oracle model to provide the positive examples, which are sampled from the oracle data distribution
    gen_data_loader.create_batches(positive_file) #把data load進來

    log = open('save/experiment-log.txt', 'w')
    #  pre-train generator
    print('Start pre-training Generator...') #MLE
    log.write('pre-training generator...\n') 
    for epoch in range(PRE_GEN_EPOCH_NUM):
        s = time.time()
        loss = pre_train_epoch(sess, generator, gen_data_loader)
        
        # detect best model
        best = 1000
        if loss < best:
            saver_gen.save(sess,"model/pretrain_gen_best")

        if epoch % 5 == 0:
            print('pre-train epoch: ', epoch, 'loss: ', loss, "time: ", time.time()-s)
            log.write('epoch:\t'+ str(epoch) + '\tloss:\t' + str(loss) + '\n')

    # pre-train discriminator
    print('Start pre-training discriminator...')
    log.write('pre-training discriminator...\n') 
    
    # Train 3 epoch on the generated data and do this for 50 times
    for epoch in range(PRE_DIS_EPOCH_NUM):
        s = time.time()
        generate_samples(sess, generator, BATCH_SIZE, generated_num, negative_file)
        dis_data_loader.load_train_data(positive_file, negative_file)
        for _ in range(3):
            dis_data_loader.reset_pointer()
            for it in range(dis_data_loader.num_batch):
                x_batch, y_batch = dis_data_loader.next_batch()
                feed = {
                    discriminator.input_x: x_batch,
                    discriminator.input_y: y_batch,
                    discriminator.dropout_keep_prob: dis_dropout_keep_prob
                }
                _,acc = sess.run([discriminator.train_op,discriminator.accuracy], feed)

        best = 0
        if acc > best:
            saver_dis.save(sess, "./model/pretrain_dis_best")
            best = acc

        print("pre-train epoch: ", epoch, " acc: ", acc," time: ", time.time()-s)
        log.write("epoch:\t" + str(epoch) + "\tacc:\t" + str(acc) + "\n")

    rollout = ROLLOUT(generator, 0.8)

    print( '#########################################################################')
    print( 'Start Adversarial Training...')
    log.write('adversarial training...\n')
    for total_batch in range(TOTAL_BATCH):
        # Train the generator for one step
        s = time.time()

        for it in range(ADV_GEN_TIME):
            samples = generator.generate(sess) # 一條seq
            rewards = rollout.get_reward(sess, samples, 16, discriminator) #MC search
            feed = {generator.x: samples, generator.rewards: rewards}
            _ = sess.run(generator.g_updates, feed_dict=feed) # do policy gradient

        # Test
        if total_batch % 5 == 0 or total_batch == TOTAL_BATCH - 1: # cal NLL
            avg = np.mean(np.sum(rewards, axis=1), axis=0) / SEQ_LENGTH
         
            #print('total_batch: ', total_batch, 'average reward: ', avg)
            log.write('epoch:\t' + str(total_batch) + '\treward:\t' + str(avg) + '\n')

            saver_seqgan.save(sess, "./model/seq_gan", global_step=total_batch)

        # Update roll-out parameters
        rollout.update_params() # train G

        # Train the discriminator
        for _ in range(5):
            generate_samples(sess, generator, BATCH_SIZE, generated_num, negative_file)
            dis_data_loader.load_train_data(positive_file, negative_file)

            for _ in range(3):
                dis_data_loader.reset_pointer()
                for it in range(dis_data_loader.num_batch):
                    x_batch, y_batch = dis_data_loader.next_batch()
                    feed = {
                        discriminator.input_x: x_batch,
                        discriminator.input_y: y_batch,
                        discriminator.dropout_keep_prob: dis_dropout_keep_prob
                    }
                    _ = sess.run(discriminator.train_op, feed)

        print('epoch: ', total_batch, 'average reward: ', avg," time: ",time.time()-s)
    
    log.close() 

    # generate examples
    print("Training Finished, starting to generating test")
    generate_samples(sess, generator, BATCH_SIZE, test_num,generate_file)
    
    print("Finish")

if __name__ == '__main__':
    main()
