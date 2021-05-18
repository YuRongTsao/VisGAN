from rawDataLoader import read_data
import pymongo
from statistics import mean 

class Raw_Data_MongoDB():
    def __init__(self,dataset_names):
        self.data_info_path = r"..\data\data_info.json"
        self.data_infos = self.load_data(self.data_info_path)

        for name in dataset_names:
            data_point = self.load_data(self.data_infos[name]["readFilePath"])    
            self.data_infos[name]["data"] = {point[self.data_infos[name]['ID_col']] : point for point in data_point}
            self.data_infos[name]['colFeatures'] = self.getColFeatures(data_point,self.data_infos[name])
     
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
            colFeatures[key] = list(value)  
            try:
                if key.split("_")[1] in {'year',"month","day"}:
                    colFeatures[key] = sorted(value)
                elif key.split("_")[1] in {"weekDay","weekday"}:
                    colFeatures[key] = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
            except:
                colFeatures[key] = list(value)
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
        

class Seq_Data_MongoDB():
    seq_dir_path = "..\\data\\generated_data\\generate.txt" 
    cost_dir_path = "..\\data\\generate_cost\\generate.json" 

    def __init__(self,baseline_model):
        self.baseline_model=baseline_model
        self.seqs = []
        self.trees = []
        
        self.costs = read_data(self.cost_dir_path,"json")
        #self.costs = [1000 if c=='none' else round(c,2) for c in self.costs]

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
   
    def create_trees(self,enumerateVizs):
        self.trees = [self.seq2tree(seq,enumerateVizs) for seq in self.seqs]
             
    def attrIdx2visIdx(self,attrIdxs,enumerateVizs):
        x = self.i2w(attrIdxs[0])
        y = self.i2w(attrIdxs[1])

        for vis in enumerateVizs:
            if vis.x == x and vis.y ==y:
                return vis.index
        return None

    def seq2tree(self,seq,enumerateVizs):
        #return "none" if there is invalid chart in the sequence
        if None in seq or "none" in seq:
            return None
        
        # ignore redundent chart
        new_seq = []
        for chart in seq:
            if chart not in new_seq:
                new_seq.append(chart)
        seq = new_seq

        # create tree sturcture
        seq_tree = defaultdict(lambda:list())
        
        # add first chart to root list
        seq_tree[-1].append(seq[0])

        # seq_type
        seq_type = 0 # 1 : X, 2: Y

        for i,chart_idx in enumerate(seq):
            if i>0:
                curr_x = enumerateVizs[chart_idx].x
                prev_x = enumerateVizs[seq[i-1]].x
                curr_y = enumerateVizs[chart_idx].y
                prev_y = enumerateVizs[seq[i-1]].y
                
                # determine seq_type first
                if seq_type==0:
                    seq_type = 1 if curr_x==prev_x else 2 if curr_y==prev_y else 1

                if seq_type == 1 :
                    # charts with the same x-axis
                    if(curr_x==prev_x):
                        seq_tree[seq[i-1]].append(chart_idx)

                    else:
                        # the child of the last chart is a empty list
                        seq_tree[seq[i-1]]=[]
                        seq_tree[-1].append(chart_idx)
                
                elif seq_type == 2:
                    # charts with the same y-axis
                    if(curr_y==prev_y):
                        seq_tree[seq[i-1]].append(chart_idx)

                    else:
                        # the child of the last chart is a empty list
                        seq_tree[seq[i-1]]=[]
                        seq_tree[-1].append(chart_idx)

        
        #最後一個補空list
        seq_tree[seq[len(seq)-1]] = []
        return seq_tree
    
    def i2w(self,attrIdx):
        return list(self.w2i.keys())[list(self.w2i.values()).index(attrIdx)]
    
    def insertInToDatabase(self,mycol):
        for i,seq in enumerate(self.seqs):
            
            if not self.trees[i] or not self.costs[i]:
                continue
            
            tree = {str(key):item for key,item in self.trees[i].items()}

            mydict = {
                "id":i,
                "seq":seq,
                "tree":tree,
                "cost":round(self.costs[i],2)
            }
            mycol.insert_one(mydict)
  
def insertSeqData(): 
    # connect to mongodb
    database = "visgan"
    collection = "sequences"

    myclient = pymongo.MongoClient("mongodb://localhost:27017/")
    mydb = myclient[database]
    mycol = mydb[collection]

    # load sequence data
    enumerateVizs_no_filter_path = r"..\data\pickle\GS\enumerateVizs_no_filter.dill"
    enumerateVizs = read_data(enumerateVizs_no_filter_path,"dill")

    # create Seq_Data_MongoDB object
    seqs_creator = Seq_Data_MongoDB("GS")
    seqs_creator.create_seq(enumerateVizs)
    seqs_creator.create_trees(enumerateVizs)
    seqs_creator.insertInToDatabase(mycol)

def formatDic(dic):
    newDic = {}

    for key,value in dic.items():
        key = str(key)
        if '.' in key:
            key = key.replace(".","_")

        if isinstance(value,dict):
            value = formatDic(value)

        newDic[key] = value

    return newDic

def insertVisData():
    # connect to mongodb
    database = "visgan"
    collection = "charts"

    myclient = pymongo.MongoClient("mongodb://localhost:27017/")
    mydb = myclient[database]
    mycol = mydb[collection]

    # load sequence data
    enumerateVizs_no_filter_path = r"..\data\pickle\GS\enumerateVizs_no_filter.dill"
    enumerateVizs = read_data(enumerateVizs_no_filter_path,"dill")

    for item in enumerateVizs:
        if item.x_type == "n":
            item.mark = "bar"
        elif item.x_type == "t":
            item.mark = "line"


        avg = {str(key): mean(value.values()) for key,value in item.points.items()}
        
        avg = formatDic(avg)

        mydic = {
            "dataset" : item.dataset,
            "filter" : item.filter,
            "index" : item.index,
            "mark" : item.mark,
            "points" : formatDic(item.points),
            "subgroup" : avg,
            "x" : item.x,
            "x_type" : item.x_type,
            "y" : item.y,
            "y_type" : item.y_type,
            "y_aggre" : "avg"
        }

        #mycol.insert_one(mydic)

def insertDataInfo():
    raw_data_mongoDB = Raw_Data_MongoDB(["Movie"])
    
    # connect to mongodb
    database = "visgan"
    collection = "raw_data_info"

    myclient = pymongo.MongoClient("mongodb://localhost:27017/")
    mydb = myclient[database]
    mycol = mydb[collection]

    # insert into database
    for name, infos in raw_data_mongoDB.data_infos.items():
        mycol.insert_one(formatDic(infos))

#insertDataInfo()
insertVisData()