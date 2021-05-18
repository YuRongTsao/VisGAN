import json
import pickle
import dill

def save_data(data,filePath,type):
    if type == "pickle":
        with open(filePath,'wb') as f:        
            pickle.dump(data,f)
    elif type == "json":
        with open(filePath,'w') as f:        
            json.dump(data,f,ensure_ascii=False,sort_keys = True, indent = 4)
    elif type == "dill":
        with open(filePath,'wb') as f:        
            dill.dump(data,f)
    elif type == "txt":
        with open(filePath,'w') as f:  
            f.write(data)
            
            
def read_data(filePath,type):
    if type=="pickle":
        with open(filePath,'rb') as f:
            return pickle.load(f)

    elif type=="dill":
        with open(filePath,'rb') as f:
            return dill.load(f)
    
    elif type =="json":
        with open(filePath,'r') as f:
            return json.load(f)
    
    elif type == "txt":
        result = []
        with open(filePath,'r') as f:
            for line in f:
                line = line.strip().split()
                result.append([attr for attr in line if attr!=str(0)])
        return result


class Raw_Data_Connector():
    def __init__(self,mydb):
        self.collection = "raw_data_info"
        self.mydb = mydb

    def get_dataInfo(self,dataset):
        for x in self.mydb[self.collection].find({"dataset": dataset}):
            return x

class Seq_Data_Connector():  
    def __init__(self,baseline_model,mydb):
        self.baseline_model=baseline_model
        self.mydb = mydb

    def get_doc_amount(self,seq_collection):
        mycol = self.mydb[seq_collection]
        return mycol.find().count()

    def get_num_of_best(self,seq_collection):
        mycol = self.mydb[seq_collection]
        return mycol.find({"cost":{"$lt": 13}}).count()
    
    def get_seq_doc(self,seq_collection,id):
        mycol = self.mydb[seq_collection]
        for x in mycol.find({"id": id}):
            return x
   
    def get_vis_doc(self,chart_collection,id):
        mycol = self.mydb[chart_collection]
        for x in mycol.find({"index": id}):
            return x

