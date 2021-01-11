import numpy as np
import json
import pickle
import dill
import time
import os
from collections import defaultdict
from visualization import Vis

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
            
class Raw_Data_Loader():
    def __init__(self,dataset_names):
        self.data_info_path = r"..\data\data_info.json"
        self.data_infos = self.load_data(self.data_info_path)
        
        self.dataset_names = dataset_names
        self.data = defaultdict(lambda:defaultdict())

        for name in dataset_names:
            data_point = self.load_data(self.data_infos[name]["readFilePath"])    
            self.data[name]["data"] = {point[self.data_infos[name]['ID_col']] : point for point in data_point}
            self.data[name]['colFeatures'] = self.getColFeatures(data_point,self.data_infos[name])
            
            #self.data[name]['enumerateVizs'] = self.enumerateVis(dataInfo,dataName)

    def load_data(self,path):
        with open(path,encoding='utf-8') as f:
            return json.load(f)
    
    def getColFeatures(self,data_points,dataInfo): 
        #calculate distinct value for not-quantitative column
        #colFeatures = {'month':[1,2,3,4,...12]}

        colFeatures = defaultdict(lambda:set())
        start = time.time()

        for point in data_points:
            for key,value in point.items():
                if key not in dataInfo['quantitative']:
                    colFeatures[key].add(value)

        # sort the value        
        for key,value in colFeatures.items():  
            try:
                if key.split("_")[1] in {'year',"month","day"}:
                    colFeatures[key] = sorted(value)
                elif key.split("_")[1] in {"weekDay","weekday"}:
                    colFeatures[key] = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
            except:
                colFeatures[key] = list(value)

        end = time.time()
        print('set col feature:' + str(end-start))
        return colFeatures
    
    def enumerateVis(self,dataset):
        
        enumerateVizs = []

        q_cols = self.data_infos[dataset]['quantitative']
        n_cols = self.data_infos[dataset]['nominal']
        t_cols = self.data_infos[dataset]['temporal']
        
        y_aggre = "avg" if dataset == "AQ" else "sum"

        # x is nominal
        if q_cols and n_cols:    
            enumerateVizs.extend([Vis(x=n_col,x_type='n',y=q_col,y_type='q',y_aggre=y_aggre,dataset=dataset,raw_data_loader=self) for n_col in n_cols for q_col in q_cols])
        
        # x is temporal
        if t_cols and q_cols:
            enumerateVizs.extend([Vis(x=t_col,x_type='t',y=q_col,y_type='q',y_aggre=y_aggre,dataset=dataset,raw_data_loader=self) for t_col in t_cols for q_col in q_cols])
            
        return enumerateVizs
        

class Seq_Data_Loader():
    
    seq_dir_path = "..\\data\\generated_data\\generate.txt" 

    def __init__(self,baseline_model):
        self.baseline_model=baseline_model
        self.seqs = []
        
        w2i_path = "..\\data\\pickle\\"+baseline_model+"\\w2i.pickle"
        self.w2i = read_data(w2i_path,"pickle")

    def create_seq(self,enumerateVizs,path=""):
        # read sequence file

        if path!="":
            self.seq_dir_path = path

        data = read_data(self.seq_dir_path,"txt")
        data = [np.reshape(seq,(-1,2)) for seq in data if len(seq)%2==0]

        charts_indices = [[self.attrIdx2visIdx(attrIdxs,enumerateVizs) for attrIdxs in seq] for seq in data] 
        self.seqs = charts_indices

        '''
        # read all files
        seq_dir_path = "..\\seqs"
        for r, d, f in os.walk(seq_dir_path):
            for file in f:
                data = read_data(seq_dir_path+"\\"+file,"txt")
                data = [np.reshape(seq,(-1,2))   for seq in data if len(seq)%2==0]

                charts_indices = [[self.attrIdx2visIdx(attrIdxs,enumerateVizs) for attrIdxs in seq] for seq in data] 
                self.seqs[file] = charts_indices
        '''
             
    def attrIdx2visIdx(self,attrIdxs,enumerateVizs):
        x = self.i2w(attrIdxs[0])
        y = self.i2w(attrIdxs[1])

        for vis in enumerateVizs:
            if vis.x == x and vis.y ==y:
                return vis.index
        return None

    def i2w(self,attrIdx):
        return list(self.w2i.keys())[list(self.w2i.values()).index(attrIdx)]
     
            

