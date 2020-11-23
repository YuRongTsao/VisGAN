###### change the features predict by seq2seq model to chart index ######

import sys
from rawDataLoader import *
from visualization import Vis

def get_chart_info(x,y,raw_data_loader):
    # return: dataset, x,y attribute type
    x_dataset = ""
    y_dataset = ""
    x_type = ""
    y_type = ""

    types = ["nominal","temporal","quantitative"]
    for dataset_name,infos in raw_data_loader.data_infos.items():
        for type in types:
            if x in infos[type]:
                x_dataset = dataset_name
                x_type = type
                break
        for type in types:
            if y in infos[type]:
                y_dataset = dataset_name
                y_type = type
                break
        if x_type!="" and y_type!="":
            break
    
    dataset = x_dataset if x_dataset==y_dataset else None
    return dataset,x_type,y_type

def create_filter(y,key,value,cht_idx,enumerateVizs,dataset,raw_data_loader):
    # check if the value is in the key
    filters = {}
    valid = True
    if key != "none":
        try:
            valid = True if value in list(map(lambda x: str(x),raw_data_loader.data[dataset]["colFeatures"][key])) else False
        except:
            valid = False
        if valid:
            # 如果y axis 跟前面一個一樣就繼承他的filter
            pre_vis = enumerateVizs[int(cht_idx)]
            if pre_vis.y == y:
                filters = {key:value for key,value in pre_vis.filter.items()}
                if key in filters:
                    if value not in filters[key]:
                        filters[key].append(value)    
            filters[key] = [value]
        else:
            print(valid)

    return valid,filters


def main():
    ### load experiment files ###
    path = "D://Tammy//University//graduate//research//test_seq2seq//VG_EXP_1//"

    ENUMERATEVIZS_PATH = path + "enumerateVizs"
    #VOCAB_TARGET = path + "vocab_target"
    SOURCE_RESULT_PATH = path + "source_result.txt"
    TARGET_RESULT_PATH = path + "target_result.txt"
    GENERATED_SEQUENCE_PATH = path + "generated_sequence.txt"
    FINAL_ENUMERATEVIZS_PATH = path + "fianl_enumerateVizs"
    Raw_Data_Loader_PATH = path + "raw_data_loader"

    source = read_data(SOURCE_RESULT_PATH,"txt")
    target = read_data(TARGET_RESULT_PATH,"txt")  
    enumerateVizs = read_data(ENUMERATEVIZS_PATH,"dill")  # i2v
    
    Vis.index = len(enumerateVizs)

    ####### handle the data path in "data_info.json"
    #dataset_names=["AQ","Transaction"]
    #raw_data_loader = Raw_Data_Loader(dataset_names)
    #save_data(raw_data_loader,Raw_Data_Loader_PATH,"dill")
    raw_data_loader = read_data(Raw_Data_Loader_PATH,"dill")

    ### change target to chart idx
    predict_seq_chart_idx = []

    print("number of sequence: " + str(len(target)))

    for i in range(len(target)):
        print("seq " + str(i))
        chart_info = target[i]
        seq_idx = source[i]
        
        x = chart_info[0]
        y = chart_info[1]
        
        # check the dataset
        dataset,x_type,y_type = get_chart_info(x,y,raw_data_loader)

        # check invalid chart
        if dataset == None:  
            predict_seq_chart_idx.append(seq_idx+["none"])
        else:
            y_aggre = "mean" if y_type == "quantitative" else "cnt"
                    
            # create filter
            filter_key = chart_info[2]
            filter_value = chart_info[3]
            valid,filters = create_filter(y,filter_key,filter_value,seq_idx[-1],enumerateVizs,dataset,raw_data_loader)
            
            if valid:
                # create Vis
                vis = Vis(x=x,y=y,y_aggre=y_aggre,filter=filters,dataset=dataset,raw_data_loader=raw_data_loader)
                if vis in enumerateVizs.values():
                    vis = enumerateVizs[list(enumerateVizs.keys())[list(enumerateVizs.values()).index(vis)]]
                    Vis.index-=1
                else:
                    enumerateVizs[vis.index] = vis
                
                predict_seq_chart_idx.append(seq_idx+[str(vis.index)])
            else:
                predict_seq_chart_idx.append(seq_idx+["none"])
    
    ### write file
    generated_sequence = "\n".join(["\t".join(list(map(lambda idx:str(idx) ,seq))) for seq in predict_seq_chart_idx])

    save_data(generated_sequence,GENERATED_SEQUENCE_PATH,"txt")
    save_data(enumerateVizs,FINAL_ENUMERATEVIZS_PATH,"dill")

main()