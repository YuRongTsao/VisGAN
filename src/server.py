from flask import Flask,request,flash,jsonify,make_response
import json
import random
from itertools import chain
import sys
sys.path.insert(0,"..//..//")
from rawDataLoader import *

########## instruction #############
# Show seqeunce result : 
#     input:
#        1. enumerateVizs
#        2. sequence chart index


### create sequence data ###
baseline_model = "GS"

if baseline_model=="GS":
    dataset_names=["Movie"]
    raw_data_loader = Raw_Data_Loader(dataset_names)

    enumerateVizs_no_filter_path = r"..\data\pickle\GS\enumerateVizs_no_filter.dill"
    enumerateVizs = read_data(enumerateVizs_no_filter_path,"dill")
    
    seq_data_loader = Seq_Data_Loader(baseline_model)
    seq_data_loader.create_seq(enumerateVizs)

elif baseline_model=="VG": 
    dataset_names=["AQ","Transaction"]
    
    path = "D://Tammy//University//graduate//research//test_seq2seq//VG_EXP_1//"
    Raw_Data_Loader_PATH = path + "raw_data_loader"
    FINAL_ENUMERATEVIZS_PATH = path + "fianl_enumerateVizs"
    GENERATED_SEQUENCE = path + "generated_sequence.txt"

    raw_data_loader = read_data(Raw_Data_Loader_PATH,"dill")
    enumerateVizs = read_data(FINAL_ENUMERATEVIZS_PATH,"dill")

    seq_data_loader = Seq_Data_Loader(baseline_model)
    seq_data_loader.create_seq(enumerateVizs,GENERATED_SEQUENCE)



def getChartData(vis,index=None,rank = 0):    
    global raw_data_loader
    chart_index = index

    if len(vis.subgroup) == 0:
        vis.setVisInfo(raw_data_loader)
        print(len(vis.subgroup))

    if vis.x in raw_data_loader.data_infos[vis.dataset]['nominal']:
        sorted_group = dict(sorted(vis.subgroup.items(),key=lambda x : x[1],reverse=True))
    else:
        sorted_group = vis.subgroup

    values = list(map(lambda value:round(value,2),list(sorted_group.values())))
    keys = list(sorted_group.keys())
    label = 'Overall' if len(vis.filter) == 0 else '\n'.join([key+'='+','.join(list(map(lambda value:str(value) if value!="" else "none",value))) for key,value in vis.filter.items()])
    data = {
        'x':vis.x,
        'y':vis.y + '(' + vis.y_aggre+')' if vis.y!=vis.x else "percentage of count",
        #'y_glo_aggre':vis.globalAggre,
        'type':vis.mark,
        'labels':keys,
        'datas':[
            {
                'data':values,
                'label':label,      
            },
        ],
        'chart_index': chart_index,
        'label':0,
        'rank':rank,
        'otherInfo':{},
        'rec':{},
        'is_selected':False,
        #'insights': {insight["key"]:insight["insightType"] for insight in vis.insights},
        'filters':vis.filter
    }

    return data

def get_seq_tree(seq_idx,dataset):
    seq = seq_data_loader.seqs[seq_idx]
   
    #若有不合法的chart
    if None in seq or "none" in seq:
        return None
    
    #若有重複的
    new_seq = []
    for chart in seq:
        if chart not in new_seq:
            new_seq.append(chart)
    seq = new_seq

    seq_tree = defaultdict(lambda:list())

    for i,chart_idx in enumerate(seq):
        if i-1>=0:
            seq_tree[seq[i-1]].append(chart_idx)
    #最後一個補空list
    seq_tree[seq[len(seq)-1]] = []
    return seq_tree

def get_tree_format(data,isNode=False):
    parents = list(data.keys())
    children = list(chain(*list(data.values())))

    first_node = [par for par in parents if par not in children][0]
 
    if not isNode:
        node = {'innerHTML':first_node}
        stacks = [node]

        while(stacks):
            curr = stacks[-1]
            stacks.pop()
            if len(data[str(curr['innerHTML'])])>0:
                curr['children'] = [{'innerHTML':child} for child in data[str(curr['innerHTML'])]]
                stacks.extend(curr['children'])
        return node
    else:
        node = {'HTMLid':first_node,'HTMLclass':"the-parent"}
        stacks = [node]

        while(stacks):
            curr = stacks[-1]
            stacks.pop()
            if len(data[str(curr['HTMLid'])])>0:
                curr['children'] = [{'HTMLid':child,'HTMLclass':"the-parent"} for child in data[str(curr['HTMLid'])]]
                stacks.extend(curr['children'])
        
        return node

app = Flask(__name__)
@app.route('/get_datasets',methods=['GET','POST'])
def get_datasets():
    #datasets =[{"name": dataset} for dataset in list(seq_data_loader.seqs.keys())]
    datasets = ["AQ","Transaction"]
    data = {"datasets":datasets}
    rst = jsonify(data)   
    rst.headers.add('Access-Control-Allow-Origin', '*')
    return rst,200

@app.route('/get_seq_num',methods=['GET','POST'])
def get_seq_num():
    if request.method == 'POST':
        print("get seq num")
        dataset = json.loads(request.get_data())["dataset"]
        #total seq num
        #total_seq_num = len(seq_data_loader.seqs[dataset])
        total_seq_num = len(seq_data_loader.seqs)

        # num of none
        #num_of_none = sum([1 for seq in seq_data_loader.seqs[dataset] if None in seq])
        num_of_none = sum([1 for seq in seq_data_loader.seqs if None in seq or "none" in seq])
        
        # num of best seq
        #num_of_best = sum([1 for cost in seq_data_loader.costs[dataset] if cost!="none" and round(float(cost),2) <= 12.69])
        num_of_best = "ignore"

        data = {"total_seq_num":total_seq_num,"num_of_none":num_of_none,"num_of_best":num_of_best}
        rst = jsonify(data)   
        rst.headers.add('Access-Control-Allow-Origin', '*')
        return rst,200

@app.route('/get_init_chart',methods=['GET','POST'])
def get_init_chart():
    global enumerateVizs,seq_data_loader
    if request.method == 'POST':
        get_data = json.loads(request.get_data()) 
        seq_idx = get_data["seq_idx"]
        dataset = get_data["dataset"]

        #get seq cost
        #seq_cost = seq_data_loader.costs[dataset][seq_idx]
        #seq_cost = round(seq_cost,2) if seq_cost != "none" else seq_cost 
        seq_cost = "ignore"

        #get seq 
        seq_tree = get_seq_tree(seq_idx,dataset)
        
        if seq_tree == None:
            data={}
            data["tree_structure"] = None
        else:
            chart_list = list(seq_tree.keys())
            #chart_datas = get_chart_datas(dataInfos,chart_list)
            chart_datas = {index:getChartData(enumerateVizs[int(index)],index) for index in chart_list}        
            
            data={}
            data["tree_structure"] = seq_tree
            data["chart_datas"] = chart_datas
            data["seq_cost"] = seq_cost
        
        rst = jsonify(data)   
        rst.headers.add('Access-Control-Allow-Origin', '*')
   
        return rst,200

@app.route('/get_seq_data',methods=['GET','POST'])
def get_seq_data():
    if request.method == 'POST':
        get_data = json.loads(request.get_data())
        data = get_data['data']
        
        if "node" not in get_data:
            node = get_tree_format(data)
        else:
            node = get_tree_format(data,get_data["node"])
        

    rst = jsonify(node)   
    rst.headers.add('Access-Control-Allow-Origin', '*')
    return rst,200  

if __name__ == "__main__":
    app.run()
    #app.run(debug=True,port=5000)
    #app.run(host="192.168.0.1",port=5010) #設定特定的IP

