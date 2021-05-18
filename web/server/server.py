from flask import Flask,request,flash,jsonify,make_response
import json
import random
from itertools import chain
import sys
sys.path.insert(0,"..//..//")
from rawDataLoader import *
import pymongo

### connect to database(mongodb)
database = "visgan"
seq_collection = "sequences"
chart_collection = "charts"

myclient = pymongo.MongoClient("mongodb://localhost:27017/")
mydb = myclient[database]

### create sequence data ###
baseline_model = "GS"

if baseline_model=="GS":
    dataset_names=["Movie"]
    raw_data_connector = Raw_Data_Connector(mydb)
    seq_data_connector = Seq_Data_Connector(baseline_model,mydb)

elif baseline_model=="VG": 
    dataset_names=["AQ","Transaction"]
    
    path = "D://Tammy//University//graduate//research//test_seq2seq//VG_EXP_1//"
    Raw_Data_Loader_PATH = path + "raw_data_loader"
    FINAL_ENUMERATEVIZS_PATH = path + "fianl_enumerateVizs"
    GENERATED_SEQUENCE = path + "generated_sequence.txt"

    raw_data_loader = read_data(Raw_Data_Loader_PATH,"dill")
    enumerateVizs = read_data(FINAL_ENUMERATEVIZS_PATH,"dill")

    seq_data_connector = Seq_Data_Connector(baseline_model,mydb)
    
def getChartData(vis,index=None,rank = 0):    
    chart_index = index

    # sort the data in decreasing order
    if vis["x"] in raw_data_connector.get_dataInfo(vis["dataset"])['nominal']:
        sorted_group = dict(sorted(vis["subgroup"].items(),key=lambda x : x[1],reverse=True))
    else:
        sorted_group = vis["subgroup"]

    # sort the key if it's time column
    try:
        if vis["x"].split("_")[1] in {'year',"month","day"}:
            int_key = [int(i) for i in vis["subgroup"].keys() if i !='None']
            sorted_group = {str(key):vis["subgroup"][str(key)] for key in sorted(int_key)}
    except:
        pass        

    values = list(map(lambda value:round(value,2),list(sorted_group.values())))
    keys = list(sorted_group.keys())
    label = 'Overall' if len(vis["filter"]) == 0 else '\n'.join([key+'='+','.join(list(map(lambda value:str(value) if value!="" else "none",value))) for key,value in vis["filter"].items()])
    data = {
        'x':vis["x"],
        'y':vis["y"] + '(' + vis["y_aggre"]+')' if vis["y"]!=vis["x"] else "percentage of count",
        #'type':vis["mark"],
        'type':'line',
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
        'filters':vis["filter"]
    }

    return data

def get_tree_format(data,isNode=False):
    
    if len(data)>0:
        node = {
            #'innerHTML': list(data.keys())[0],
            'innerHTML': "root",
            'pseudo': True,
        }

        stacks = [node]

        while(stacks):
            curr = stacks[-1]
            stacks.pop()
                
            if len(data[curr['innerHTML']])>0:
                curr['connectors'] = {
                    "style":{
                        "stroke-width": 0.0
                    }
                }
                curr['children'] = [{'innerHTML':child} for child in data[curr['innerHTML']]]
                stacks.extend(curr['children'])
    else:
        node = {}

    return node

app = Flask(__name__)
@app.route('/get_datasets',methods=['GET','POST'])
def get_datasets():
    datasets = {
    "values": [
      {
        "name": 'generate',
        "value": 'generate',
        "selected" : True
      },
      {
        "name"     : 'AQ',
        "value"    : 'AQ',
      }
    ]
  }
    
    data = {"datasets":datasets}
    rst = jsonify(data)   
    rst.headers.add('Access-Control-Allow-Origin', '*')
    return rst,200

@app.route('/get_seq_num',methods=['GET','POST'])
def get_seq_num():
    if request.method == 'POST':
        
        dataset = json.loads(request.get_data())["dataset"]
        
        #total seq num
        total_seq_num = seq_data_connector.get_doc_amount(seq_collection)

        # num of none
        num_of_none = "ignore"

        # num of best seq
        num_of_best = seq_data_connector.get_num_of_best(seq_collection)

        data = {"total_seq_num":total_seq_num,"num_of_none":num_of_none,"num_of_best":num_of_best}
        rst = jsonify(data)   
        rst.headers.add('Access-Control-Allow-Origin', '*')
        return rst,200

@app.route('/get_init_chart',methods=['GET','POST'])
def get_init_chart():
    if request.method == 'POST':
        get_data = json.loads(request.get_data()) 
        seq_idx = get_data["seq_idx"]
        dataset = get_data["dataset"]

        #get document
        doc = seq_data_connector.get_seq_doc(seq_collection,seq_idx)

        #get seq cost
        seq_cost = doc["cost"]

        #get tree
        seq_tree = doc["tree"]

        if seq_tree == None:
            data={}
            data["tree_structure"] = None
        else:
            chart_list = doc["seq"]
            chart_datas = {index:getChartData(seq_data_connector.get_vis_doc(chart_collection,int(index)),index) for index in chart_list}        
            

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
    app.run(debug=True,port=5000)

