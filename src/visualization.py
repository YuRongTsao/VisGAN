from collections import defaultdict
import statistics
from scipy.stats import entropy
import json


class Vis():
    index = 0
    def __init__(self,x='',x_type="nominal",y='',y_type="quantitative",y_aggre='mean',mark='line',filter=defaultdict(list),dataset=None,raw_data_loader=None):
        self.mark = mark
        self.x = x
        self.x_type = x_type
        self.y = y
        self.y_type = y_type
        self.y_aggre = y_aggre
        self.filter = filter
        self.index = Vis.index
        self.dataset = dataset
        Vis.index += 1

        self.pre_vis = None
        self.globalAggre = None

        self.setVisInfo(raw_data_loader)

    def setVisInfo(self,raw_data_loader):
        self.points = self.getPoints(raw_data_loader)
        self.subgroup = self.getSubgroup(raw_data_loader)
    

    def aggregate(self,aggre,points):
        if len(points) == 0:
            return 0

        switcher = {
            'cnt' : lambda x: len(x),
            'sum':  lambda x: sum(x),
            'mean' : lambda x: statistics.mean(x),
        }
        
        '''
        if aggre!='cnt':
            points = list(map(lambda value : float(value.replace(',','')) if isinstance(value,str) else float(value),points)) #handle 1,134.58
        '''

        return switcher.get(aggre,'nothing')(points)

    def matchFilter(self,point,filters):
        for key,values in filters.items():
            if str(point[key]) not in list(map(lambda x: str(x),values)) : return False
        return True

    def getPoints(self,raw_data_loader):
        # points = {
        #   '2014': {'10':10,'4':5}  => id:value 
        # }
        # points = {
        #   '嘉義':{
        #       '2014': {'10':10,'4':5}  => id:value 
        #    }
        # }
        points =defaultdict(lambda:defaultdict())
        data = raw_data_loader.data[self.dataset]['data']

        if not self.pre_vis: #沒有前人的
            for id,point in data.items():
                if self.matchFilter(point,self.filter) and self.x in point and self.y in point and point[self.y] not in {'-',None} :      
                    points[point[self.x]][id]=point[self.y] #TODO 變成tuple
            points = {key:value for key,value in points.items() if len(value)>0}
            
            
        else: #比之前再多加filter而已
            #TODO handle有Z軸的
            for key,old_points in self.pre_vis.points.items():
                points[key] = { pointID :value for pointID,value in old_points.items() if self.matchFilter(data[pointID],self.filter)}
            points = {key:value for key,value in points.items() if len(value)>0}

        return points

    def getSubgroup(self,raw_data_loader):
        subgroup = defaultdict(lambda:0)
        #newSubgroup = defaultdict(lambda:0)

        #為了讓 x 軸的排序一樣
        colFeatures = raw_data_loader.data[self.dataset]['colFeatures']
        for key in list(colFeatures[self.x]):
            if key in self.points:
                subgroup[key] = self.aggregate(self.y_aggre,self.points[key].values())

        '''
        if self.globalAggre=='per':
            for key,values in subgroup.items():
                if isinstance(values,dict):
                    total = sum(values.values())
                    for key_x,value in values.items():
                        newSubgroup[key][key_x] = value / total if total!= 0 else 0
                else:
                    total = sum(subgroup.values()) 
                    newSubgroup[key] = values / total if total!= 0 else 0
            
            if self.x in dataInfos[curr_data]['nominal']:
                subgroup = dict(sorted(newSubgroup.items(),key=lambda x : x[1],reverse=True))
            else:
                subgroup = newSubgroup
        '''
        return subgroup   
   
    def vega_lite(self,data_info):
        #return vega-lite json 
        result = {}
        #result["data"] = {"url":data_info["GS_filepath"],"formatType": "json"}
        result["data"] = data_info["dataset"]
        result["mark"] = self.mark
        result["encoding"] = {
            "x":{
                "field":self.x,
                "type":self.x_type
                },
            "y":{
                "field":self.y,
                "type":self.y_type,
                "aggregate":self.y_aggre
                },
            }
        
        filters = [{"field": key,"equal":value[0]} for key,value in self.filter.items()]
        if len(filters)>0:
            result["transform"] = {"filter": filters}
        result["index"] = self.index

        return result
    def features(self):
        features = []
        num_features=9
        # x
        features.append(self.x)
        # y
        features.append(self.y)
        #filter --> 只記錄最新的一個?
        key = list(self.filter.keys())[-1] if len(self.filter)!=0 else "none"
        features.append(key)
        #filter value -->只記錄最新的一個
        filter_value = self.filter[key][-1] if key!="none" else "none"
        features.append(filter_value)
        #entropy
        distribution = list(self.subgroup.values())
        features.append(entropy(distribution))
        # max point
        try:
            max_key = max(self.subgroup, key=self.subgroup.get)
        except:
            return ["none"]*num_features
        features.append(max_key)
        # min point
        min_key = min(self.subgroup, key=self.subgroup.get)
        features.append(min_key)
        # mean
        features.append(statistics.mean(list(self.subgroup.values())))
        # variance
        try:
            features.append(statistics.variance(list(self.subgroup.values())))
        except:
            print("X: " , str(self.x) , "Y: " ,str(self.y))
            print("subroup")
            print(list(self.subgroup.values()))
        
        # outlier
        # deviation
        return features


    def __eq__(self, other):
        if isinstance(other, Vis):
            filter = True
            if len(self.filter)!=len(other.filter):
                filter = False
            else:
                for key,value in self.filter.items():
                    if key not in other.filter: 
                        filter = False
                        break
                    elif set(self.filter[key]) != set(other.filter[key]):
                        filter = False
                        break
            return self.x == other.x and self.y == other.y and filter==True
        return False
        