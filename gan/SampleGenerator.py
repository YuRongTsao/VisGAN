from rawDataLoader import *
from visualization import Vis
import os
import itertools
import time
import pickle
import json
import dill
from itertools import chain


class GS_Seq_generator(): # generate GraphScape sequence
    def __init__(self,m=100):
        self.m = 100


    def random_combination(self,enumerateVizs):
        # random pick 6 vis
        start = time.time()
        result = list(itertools.combinations(enumerateVizs,6))

        end = time.time()
        print("combintaion:",str(end-start))
        return result

    def manual_combination(self,data_info,vega_enumerateVizs):
        X = data_info["temporal"] + data_info["nominal"] 
        Y = data_info["quantitative"]
        result = []
        cases = [(2,3),(3,2)]
        for case in cases:
            cand_x = list(itertools.combinations(X,case[0]))
            cand_y = list(itertools.combinations(Y,case[1]))

            for x in cand_x:
                for y in cand_y:
                    # 1 seq
                    permu = list(itertools.product(list(x),list(y)))
                    result.append([self.find_vega(x,y,vega_enumerateVizs) for x,y in permu])
        return result   

    def find_vega(self,x,y,vega_enumerateVizs):
        for vis in vega_enumerateVizs:
            if vis["encoding"]["x"]["field"] == x and vis["encoding"]["y"]["field"] == y:
                return vis       

class VisGuide_Seq_generator(): # generate VisGuide sequences
    def __get_seq_from_tree(self,trees):
        result = []

        for tree in trees.values():
            parents = set(list(tree.keys()))
            children = set(list(itertools.chain(*list(tree.values()))))
            root = list(parents-children)[0]

            # if only root has vis , let the comparison vis formed a sequence
            has_other_child = False
            for key,value in tree.items():
                if key!=root:
                    if len(value) != 0:
                        has_other_child = True
                        break
            if not has_other_child:
                seq = [root]
                seq.extend(tree[root])
                if len(seq)>1: result.append(seq)
            else:
                #DFS
                visited = {root}
                stack = [root]
                while stack:
                    node = stack[-1] 
                    if node not in visited:
                        visited.add(node)
                    remove_from_stack = True
                    
                    #判斷node是否為leaf
                    if tree[node]:
                        for next in tree[node]:
                            if next not in visited:
                                stack.append(next)
                                
                                remove_from_stack = False
                                break
                        if remove_from_stack:
                            stack.pop()
                    else: #若是leaf
                        result.append(stack[0:])
                        stack.pop()
        return result

    def __chart_idx_to_vega(self,seqs,chart_data,raw_data_loader,dataset):
        seqs_vega = []
        seqs_featrue = []

        enumerateVizs = raw_data_loader.data[dataset]["enumerateVizs"]
        data_info = raw_data_loader.data_infos[dataset]
        CH2EN = raw_data_loader.data[dataset]["CH2EN"]

        for seq in seqs:
            vegas = []
            features = []

            for chart in seq:
                chart_info = chart_data[chart[1:]]

                # handle y = percentage of count
                y = chart_info["y"]
                if y!="percentage of count":
                    y = y[:-5] 
                    y_aggre = "mean"
                else:
                    y = chart_info["x"]
                    y_aggre = "cnt"
                    y_type = "nominal"

                # handle y_aggre
                #y_aggre = "mean" if chart_info["y"][-4:][1:4] == "avg" else "cnt"
                
                # change to english
                filters= {}
                for key,value in chart_info["filters"].items():
                    try:
                        value = list(map(lambda v: CH2EN[v],value))
                    except:
                        pass
                    filters[key] = value
                
                vis = Vis(x=chart_info["x"],y=y,y_aggre=y_aggre,filter=filters,dataset=dataset,raw_data_loader=raw_data_loader)
                if vis in enumerateVizs:
                    vis = enumerateVizs[enumerateVizs.index(vis)]
                else:
                    enumerateVizs.append(vis)
                vegas.append(vis.vega_lite(data_info))
                features.append(vis.features())    
            seqs_vega.append(vegas)
            seqs_featrue.append(features)
        return seqs_vega,seqs_featrue
    
    def _split_train_pairs(self,chart_indices,enumerateViz,vocab_target,dataset_info):
        train_source = []
        train_target = []
        mask_dataset = []

        for j,seq in enumerate(chart_indices):
            for i in range(1,len(seq)):
                source = seq[:i]
                target = enumerateViz[seq[i]].features()
                if target== None:
                    continue
                target = [vocab_target[str(key)] for key in enumerateViz[seq[i]].features()[:4]]
                train_source.append(source)
                train_target.append(target)
                mask_dataset.append(dataset_info[j])
        
        return train_source,train_target,mask_dataset

    def _source_chart_idx(self,seqs,chart_data,enumerateVizs,raw_data_loader,dataset):
        train_source = []
        CH2EN = raw_data_loader.data[dataset]["CH2EN"]

        for seq in seqs:
            chart_indices = []

            for chart in seq:
                chart_info = chart_data[chart[1:]]

                # handle y = percentage of count
                y = chart_info["y"]
                if y!="percentage of count":
                    y = y[:-5] 
                    y_aggre = "mean"
                else:
                    y = chart_info["x"]
                    y_aggre = "cnt"
                    y_type = "nominal"

                # change to english
                filters= {}
                for key,value in chart_info["filters"].items():
                    try:
                        value = list(map(lambda v: CH2EN[v],value))
                    except:
                        pass
                    filters[key] = value
                
                # create Vis
                vis = Vis(x=chart_info["x"],y=y,y_aggre=y_aggre,filter=filters,dataset=dataset,raw_data_loader=raw_data_loader)
                if vis in enumerateVizs.values():
                    vis = enumerateVizs[list(enumerateVizs.keys())[list(enumerateVizs.values()).index(vis)]]
                    Vis.index-=1
                else:
                    enumerateVizs[vis.index] = vis
                
                chart_indices.append(vis.index)

            train_source.append(chart_indices)

        return train_source

    def generate_sequence(self,raw_data_loader,path): 
        """
        ##### generate a directory that contains the following file in the "traning_data" dir  ####
            1. EnumerateVizs
            2. vocab_target
            3. train_source.txt
            4. train_target.txt
        
        ##### return:
            1. chart indices seq = [0,2,4,6,8]    
        """
        start = time.time()
        ENUMERATEVIZS_PATH = path + "enumerateVizs"
        VOCAB_TARGET = path + "vocab_target"
        TABLE_PATH = path + "table"
        TRAIN_SOURCE_PATH = path + "train_source.txt"
        TRAIN_TARGET_PATH = path + "train_target.txt"
        MASK_DATASET_PATH = path + "mask_dataset.txt"


        ### 1.create enumerateVizs(vocab_source) ###
        enumerateVizs = {vis.index: vis for dataset,datas in raw_data_loader.data.items() for i,vis in enumerate(datas["enumerateVizs"])}
        
        ### 2.create tables ###
        #     a.vocab_target(cols + value)
        #     b.mask_table

        vocab_target = []
        attri_names = []
        value_names = []
        quan_attri_list = []
        table_info = dict()
        
        dataset_names=["AQ","Transaction"]

        for dataset in dataset_names:
            data_info = raw_data_loader.data_infos[dataset]
            
            # attribute names
            cols = data_info["nominal"] + data_info["temporal"] + data_info["quantitative"]
            table_info[dataset] = [c for c in cols]
            table_info[dataset].append("none")
            attri_names.extend(cols)
            
            # filter_value
            value_keys = data_info["nominal"] + data_info["temporal"]
            for key in value_keys:
                values = list(map(lambda x: str(x),raw_data_loader.data[dataset]["colFeatures"][key]))
                table_info[key] = values
                value_names.extend(values)
            
            #create quan list
            quan_attri_list.extend(data_info["quantitative"])

        table_info["none"] = ["none"]

        all_vocab_target =  list(set(attri_names)) + list(set(value_names))
        all_vocab_target.insert(0,"none")
        vocab_target = dict(zip(all_vocab_target,range(len(all_vocab_target))))
        
        #save_data(vocab_target,VOCAB_TARGET,"dill")

        # record the number of the attribute name
        attri_names_len = len(list(set(attri_names)))+1
        vocab_size = len(vocab_target)
        key_size = attri_names_len + len(dataset_names)
        table = np.zeros((key_size,vocab_size))

        # create table
        for i in range(attri_names_len):
            key = all_vocab_target[i]
            indices = [vocab_target[value] for value in table_info[key]] if key not in quan_attri_list else []
            table[i,:][indices] = 1
        for i,key in enumerate(dataset_names):
            indices = [vocab_target[value] for value in table_info[key]] if key!="none" else []
            table[attri_names_len + i,:][indices] = 1
        
        '''
        i2w_target = dict([(value, key) for key, value in vocab_target.items()]) 
        indices = np.where(table[5]==1)[0]
        print(i2w_target[5])
        print([i2w_target[idx] for idx in indices])
        '''

        # reset table_info
        table_info = {}
        for i,dataset in enumerate(dataset_names[::-1]):
            table_info[dataset] = len(table)-1-i

        #save_data(table.tolist(),TABLE_PATH,"json")
        #save_data(table,TABLE_PATH,"dill")


        # set Vis index 
        Vis.index = max(list(enumerateVizs.keys()))+1

        ### create 3.train_source and 4.train_target file ###
        E1_result_path = '..//VisGuide//src//result//E1'
        datasets = ["AQ","Transaction"]
        seqs_idx = []
        dataset_info = []

        for r, d, _ in os.walk(E1_result_path):
            for dir in d:
                print("dir: " , str(dir))
                for _,_,f in os.walk(E1_result_path+"//"+dir):
                    for file in f: 
                        #if dir == "1" and file == "user_1_Transaction_E1.json":
                            datasetName = file
                            try:
                                datasetName = datasetName.split("_")[2]
                            except:
                                pass
                            if datasetName in datasets:
                                print("file: ",file)

                                #read file
                                data = read_data(E1_result_path+"//"+dir+'//'+file,"json")
                                trees = data["store_structure"]
                                chart_data = data["store_chart_data"]
                                dataset = data["store_dataset"]
                                seqs = self.__get_seq_from_tree(trees) # id 為 #chart_1
                                seqs_idx.extend(self._source_chart_idx(seqs,chart_data,enumerateVizs,raw_data_loader,dataset))
                                dataset_info.extend([table_info[dataset]]*len(seqs))
                        
        train_source,train_target,mask_dataset = self._split_train_pairs(seqs_idx,enumerateVizs,vocab_target,dataset_info)

        #### change target source to txt ###
        train_source = "\n".join(["\t".join(list(map(lambda idx:str(idx) ,seq))) for seq in train_source])
        train_target = "\n".join(["\t".join(list(map(lambda idx:str(idx) ,seq))) for seq in train_target])
        mask_dataset = "\n".join(list(map(lambda idx:str(idx) ,mask_dataset)))

        save_data(enumerateVizs,ENUMERATEVIZS_PATH,"dill")
        save_data(vocab_target,VOCAB_TARGET,"dill")
        save_data(table,TABLE_PATH,"dill")

        save_data(train_source ,TRAIN_SOURCE_PATH,"txt")
        save_data(train_target ,TRAIN_TARGET_PATH,"txt")
        save_data(mask_dataset ,MASK_DATASET_PATH,"txt")

        end = time.time()
        print("finish" + str(start-end))
    

def main():

    baseline_model = "GS" 
    # Define the ground truth model, possible values are as follows: 
    # "GS": graphscape; "VG": VisGuide

    if baseline_model == "GS":
        
        enumerateVizs_no_filter_path = r"..\data\pickle\GS\enumerateVizs_no_filter.dill"
        vega_enumerateVizs_no_filter_path = r"..\data\pickle\GS\vega_enumerateVizs_no_filter.json"
        combinations_path = r"..\data\pickle\GS\combination_no_filter.pickle"
  
        # check if there is pickle file 
        if not os.path.isfile(enumerateVizs_no_filter_path):

            # enumerate vis of different dataset
            dataset_names = ["Movie"]
            raw_data_loader = Raw_Data_Loader(dataset_names)
            enumerateVizs = raw_data_loader.enumerateVis(dataset_names[0])
            save_data(enumerateVizs,enumerateVizs_no_filter_path,"dill")

            # change the enumerate vizs to vega-lite form
            vega_enumerateVizs = [vis.vega_lite(raw_data_loader.data_infos["Movie"]) for vis in enumerateVizs]
            save_data(vega_enumerateVizs,vega_enumerateVizs_no_filter_path,"json")    

            # create combination
            gs_generator = GS_Seq_generator()
            combinations = gs_generator.manual_combination(raw_data_loader.data_infos[dataset_names[0]],vega_enumerateVizs)
            save_data(combinations,combinations_path,"pickle")
            
        
    elif baseline_model == "VG":
        #dataset_names=["AQ","Transaction"]
        #raw_data_loader = Raw_Data_Loader(dataset_names)
        #save_data(raw_data_loader,"data//pickle//raw_data_loader","dill")
        raw_data_loader = read_data("..//data//pickle//raw_data_loader","dill")


        #generate a directory that contains files in the "traning_data" dir
        TRAINING_DATA_EXPERIMENT_PATH = "..//data//training_data//VG_EXP_1//"
        visGuide_seq_generator = VisGuide_Seq_generator()
        visGuide_seq_generator.generate_sequence(raw_data_loader,TRAINING_DATA_EXPERIMENT_PATH)
    
main()


        

       


    

    

