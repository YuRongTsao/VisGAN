import sys
sys.path.append(r'../web/src')

from rawDataLoader import *
from itertools import chain


def w2i_generator(data_info):
    #create word2idx
    words = data_info["nominal"] + data_info["temporal"] + data_info["quantitative"]
    w2i = {word : str(i+1) for i,word in enumerate(words)}
    w2i[""] = str(0)

    w2i_path = r"..\data\pickle\GS\w2i.pickle"
    save_data(w2i,w2i_path,"pickle")
    return w2i

def train_data(w2i,enumerateVizs,seq_len,raw_seq_path,positive_path): 
    # Create features : 
    # The representation of each chart.
    # In this experiment, we only use the attributes of X and Y axis to represent the chart feature

    # from chart index to word index (word-> attribute name)
    raw_seqs = read_data(raw_seq_path,"json")
    idx_seqs = [list(chain(*[[w2i[enumerateVizs[chart_idx].x],w2i[enumerateVizs[chart_idx].y]] for chart_idx in seq["chart_indices"]])) for seq in raw_seqs]

    # use string(sentence) to represent the sequence
    # there are 6 chart in a sequence, each chart has 2 features (X,Y axis attributes), 
    # so there are two words in one chart. There are total 12 words in a sequence, as
    # the maximum sequence length is 20 (20 words in a sequence, users can adjust the sequence length), 
    # the last 8 words are null and the index of null word is "0". 
    idx_seqs = [" ".join(seq + [str(0)]*(seq_len-len(seq))) for seq in idx_seqs]
    save_data(idx_seqs,positive_path,"txt")

def main():

    # load data infos
    datasets = ["Movie"]
    curr_dataset = "Movie"
    raw_data_loader = Raw_Data_Loader(datasets)
    data_info = raw_data_loader.data_infos[curr_dataset]

    #create w2i (word to index, word vector, word embedding)
    w2i = w2i_generator(data_info)

    #create training data
    raw_seq_path = r"..\data\training_data\raw_train.json"  #Sequence data. The number is the index of each chart. 
    positive_path = r"..\data\training_data\positive.txt" 
    enumerateVizs_no_filter_path = r"..\data\pickle\GS\enumerateVizs_no_filter.dill"
    #vega_enumerateVizs_no_filter_path = r"..\data\pickle\GS\vega_enumerateVizs_no_filter.json"
    #combinations_path = r"..\data\pickle\GS\combination_no_filter.pickle"
    seq_len = 20
    enumerateVizs = read_data(enumerateVizs_no_filter_path,"dill")

    train_data(w2i,enumerateVizs,seq_len,raw_seq_path,positive_path)

main()
    
    


