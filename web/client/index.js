//global var
var curr_seq_num = 0
var total_seq_num = 800
var curr_dataset = ""

var global_chart_id=0
var main_chart_id
var main_insight_key = ''
var sheet_num = 1
var curr_sheet_num=1
var label_data = {}

var explore_views = {}
var seq_views = {}
var curr_system = "Our"
var tree_structures = {
    "generate":{},
    
}
var chart_datas = {
    "generate":{},
}
var store_label_data ={
    "generate":[],
}
var selected_nodes = {
    "generate":{},
}


function setAttributes(el, options) {
    Object.keys(options).forEach(function(attr) {
      el.setAttribute(attr, options[attr]);
    })
 }
 function addSheetContainer(){
    main_chart_id =''
    var sheet_container_id = 'sheet_container_'+curr_sheet_num.toString()
    var explore_view_id = 'explore_view_'+curr_sheet_num.toString()
    var seq_view_id = 'seq_view_'+curr_sheet_num.toString()
    
    var seq_container = document.getElementById('seq_container')
    var sheet_container = document.createElement("div")
    setAttributes(sheet_container,{"data-dataset":curr_dataset,"class":"ui internally celled two grid column","id":sheet_container_id})
    var row = document.createElement("div")
    setAttributes(row,{class:"row"})
    var col_1 = document.createElement("div")
    setAttributes(col_1,{"id":"col_1","style":"width:15%","class":"column"})
    var h4Title_1 = document.createElement("h4")
    h4Title_1.innerHTML = "Exploration view"
    var explore_view = document.createElement("div")
    setAttributes(explore_view,{id:explore_view_id,style:"overflow: auto;height:200px; width: 100%; border: 3px solid #DDD; border-radius: 3px;"})
    var col_2 = document.createElement("div")
    setAttributes(col_2,{"style":"width:100%","class":"column"})
    //setAttributes(col_2,{"style":"width:85%","class":"column"})
    var h4Title_2 = document.createElement("h4")
    setAttributes(h4Title_2,{"style":"float: left;"})
    h4Title_2.innerHTML = "Sequence view"
    var seq_filter = document.createElement("div")
    setAttributes(seq_filter,{"id":"seq_filter"+curr_sheet_num.toString(),"style":"clear: left;"})
    var seq_view = document.createElement("div")
    setAttributes(seq_view,{"style":"clear: left;"})
    //setAttributes(seq_view,{"id":seq_view_id,"class":"split split-vertical","style":"white-space: nowrap;text-align : left;height: 100%; overflow-x:auto"})
    setAttributes(seq_view,{"id":seq_view_id,"style":"overflow-x:auto"})

    seq_container.appendChild(sheet_container)
    sheet_container.appendChild(row)
    row.appendChild(col_1)
    col_1.appendChild(h4Title_1)
    col_1.appendChild(explore_view)
    row.appendChild(col_2)
    //col_2.appendChild(h4Title_2)
    col_2.appendChild(seq_filter)
    col_2.appendChild(seq_view)
}
function addExploreView(){
    var explore_tree_structure = {
        chart: {
            container: "#explore_view_"+curr_sheet_num.toString(), // div id
            callback : {
                onAfterAddNode: nodeEvent,
                onTreeLoaded :nodeEvent
            },
            rootOrientation :"WEST",
            levelSeparation:    20,
            siblingSeparation:  30,
            subTeeSeparation:   30,
            nodeAlign: "BOTTOM",
            padding: 35,
            node: { 
                HTMLclass: "evolution-tree",
                collapsable: false
            },
            connectors: {
                type: "curve",
                style: {
                    "stroke-width": 2,
                    "stroke-linecap": "round",
                    "stroke": "#ccc"
                }
            },
        },
        nodeStructure: {
            pseudo :true,
            HTMLid:'root',
        }
    };
    var explore_view = new Treant(explore_tree_structure,null,$);
    explore_views[curr_sheet_num-1]=explore_view
}
function addNewChart(chart_data){
    //cal new chart info index
    ++global_chart_id
    var chart_id = "a_chart_".concat(global_chart_id.toString());
    

    //update all chart data
    chart_datas[curr_dataset][chart_id] = chart_data
    
    //create the pseudo element for the seq view tree
    var chart_temp =document.getElementById('chart_temp') 
    var chart_div = document.createElement("div")
    setAttributes(chart_div,{class:"ui three column grid",id:chart_id,style:"display: inline-block;width: 300px;height:250px;"})
    chart_temp.appendChild(chart_div)
    
    //update explore view
    addNode(global_chart_id.toString())

}
function addNode(chart_id_index){
    //create tree_structure data
    var tree_structure = {}
    
    //dynamic add node   
    var num = main_chart_id.substring(8)
    var parent_node = $('#node_'+num.toString())
    if(parent_node.length==0){ //是第一張圖
        parent_node = $('#root')
        var parent_id = "#seq_root"
    }else{
        var parent_id = '#a_chart_'+num.toString()
        tree_structure = tree_structures[curr_dataset][curr_sheet_num-1]
    }
    var parent_info = parent_node.data('treenode');
    var node_id = "node_"+chart_id_index.toString()
    //new node infp
    var new_node_info = { 
        HTMLclass: "the-parent", 
        HTMLid: node_id
    };
    explore_views[curr_sheet_num-1].tree.addNode(parent_info, new_node_info);
    parent_info.collapsed=false
    //change color
    $('#'+node_id).css({'background-color':"#AAAAAA"});
    $('#'+node_id).addClass("selected")

    
    child_id = '#a_chart_'+chart_id_index.toString()
    
    if(parent_id != "#seq_root"){
        if(Object.keys(tree_structure).length!=0){
            tree_structure[parent_id].push(child_id)
        }else{
            tree_structure[parent_id] = [child_id]
        }
    }
    
    tree_structure[child_id]=[] // child node 
    tree_structures[curr_dataset][curr_sheet_num-1]=tree_structure

    //check if the node is selected. only show the node which is selected
    updateSeqViewByExloreView()
}

function updateSeqView(tree_structure){
    seq_data={}
    seq_data.data=tree_structure
    $.ajax({
        type: 'POST',
        //url:"https://sequencegeneration.herokuapp.com/",
        //url:"http://127.0.0.1:5000/get_seq_data",
        url:"http://127.0.0.1:5000/get_seq_data",
        data:JSON.stringify(seq_data)
    }).done(function(responce){
        //console.log(responce)
        
        if(seq_views.hasOwnProperty(curr_sheet_num-1)){ //已經有tree了
            seq_views[curr_sheet_num-1].destroy()
        }
        //create tree
        var seq_tree_structure = {
            chart: {
                container: "#seq_view_"+curr_sheet_num.toString(), // div id
                rootOrientation :"WEST",
                levelSeparation:    80,
                siblingSeparation:  30,
                subTeeSeparation:   30,
                nodeAlign: "BOTTOM",
                padding: 35,
                node: { 
                    collapsable: false
                },
                connectors: {
                    type: "curve",
                    style: {
                        "stroke-width": 2,
                        "stroke-linecap": "round",
                        "stroke": "#ccc"
                    }
                },
            },
            nodeStructure:responce
        };
        var seq_view = new Treant(seq_tree_structure,null,$);
        seq_views[curr_sheet_num-1]=seq_view
        
        //create the update chart id list
        var chart_id_list = Object.keys(tree_structure)

        //add element and draw canvas
        for(let i=0;i<chart_id_list.length;i++){
            addElement(chart_id_list[i].substring(1))
        }

        //hightlight main chart
        if(main_chart_id){
            var block = document.getElementById(main_chart_id+'-clone')
            if(block){
                block.style.border = "2px #99BBFF solid"
            }else{
                cleanRecCanvas()
            }
        }
        //move the explore view
        if(main_chart_id){
            var explore_view = document.getElementById("explore_view_"+curr_sheet_num.toString())
            var seq_view = document.getElementById(main_chart_id+'-clone')
            if(seq_view){
                explore_view.style.top = seq_view.style.top
            }
        }
    });    
}

function addElement(chart_id){
    var col_id = "seq_chart_col_".concat(chart_id.substring(8));
    var canvas_id =  "seq_chart_".concat(chart_id.substring(8));
    var chart_data = chart_datas[curr_dataset][chart_id]
    //target chart div
    var chart_div = document.getElementById(chart_id+'-clone')
    
    // create html 
    var new_row = document.createElement("div")
    setAttributes(new_row,{class:"row"})
    var new_col = document.createElement("div")
    setAttributes(new_col,{id:col_id,style:"width: 90%;padding: 0%"})
    var new_canvas = document.createElement("canvas")
    //setAttributes(new_canvas,{id:canvas_id,style:"width: 250px;height:250px"})
    setAttributes(new_canvas,{id:canvas_id,width: "250px",height:"250px"})
    var new_col_1 = document.createElement("div")
    setAttributes(new_col_1,{style:"width: 10%;padding: 0%"})
    var new_row_1 = document.createElement("div")
    setAttributes(new_row_1,{class:"row"})
    var new_col_2 = document.createElement("div")
    setAttributes(new_col_2,{class:"column"})
    var new_button = document.createElement("button")
    setAttributes(new_button,{class:"ui icon button",style:"background: transparent"})
    var new_icon = document.createElement("i")
    setAttributes(new_icon,{class:"red heart outline icon",style:"background: transparent"})
    new_icon.onclick = onRedHeartBtnClick
    var new_row_2 = document.createElement("div")
    setAttributes(new_row_2,{class:"row"})
    var new_col_3 = document.createElement("div")
    setAttributes(new_col_3,{class:"column"})
    var new_button_1 = document.createElement("button")
    setAttributes(new_button_1,{class:"ui icon button",style:"background: transparent"})
    var new_icon_1 = document.createElement("i")
    setAttributes(new_icon_1,{class:"yellow star outline icon",style:"background: transparent"})
    new_icon_1.onclick = onYelloStarBtnClick
    

    //set heart and star
    if(chart_data.label == 1.0){
        new_icon.setAttribute('class','red heart icon')
    }else if(chart_data.label == 0.3){
        new_icon_1.setAttribute('class','yellow star icon')
    }


    // add html
    chart_div.appendChild(new_row)
    new_row.appendChild(new_col)
    new_col.appendChild(new_canvas)
    
    new_row.appendChild(new_col_1)
    new_col_1.appendChild(new_row_1)
    new_row_1.appendChild(new_col_2)
    new_col_2.appendChild(new_button)
    new_button.appendChild(new_icon)

    new_col_1.appendChild(new_row_2)
    new_row_2.appendChild(new_col_3)
    new_col_3.appendChild(new_button_1)
    new_button_1.appendChild(new_icon_1)

    drawLine(chart_data,canvas_id,col_id,chart_id)

} 
function drawLine(data,id,chart_container_id="",chart_id=""){
    //format the data
    var datasets = [];
    var colors = [
        {
            main:"#3e95cd",
            insight:"#ff9ea5",
            hightlight:"#fbf5f3",
            hightlight_border:"#70abaf",
        },
        {
            main:"#c9dfee",
            insight:"#ffe6e8"
        }
    ]
    //update label
    var star = $('#'+id).parents('.ui.three.column.grid').find(".yellow.star")
    var heart = $('#'+id).parents('.ui.three.column.grid').find(".red.heart")
    if(parseFloat(data.label) == 0.3){ 
        star.removeClass("outline");
        heart.addClass("outline");
    
    }else if(parseFloat(data.label) == 1.0){
        heart.removeClass("outline")
        star.addClass("outline")
    }else{
        star.addClass("outline")
        heart.addClass("outline")
    }

    //destroy old canvas
    document.getElementById(id).remove()
    //add new canvas
    if (chart_container_id == "")  chart_container_id = getChartContainerID(id)
    document.getElementById(chart_container_id).innerHTML="<canvas id=".concat("\'",id,"\'style=\"width: 250px;height:250px\"></canvas>")
    //show chart
    if (chart_id == "")  chart_id = getChartID(id)
    document.getElementById(chart_id).style.visibility="visible";
    //get canvas
    var element = document.getElementById(id)

    data.datas.forEach(function(item,index,array){
        var temp = {}
        temp.data = item.data;
        temp.label = item.label
        temp.borderColor = colors[index].main;
        temp.fill = false
        
        if(index==0){
            insight_indice = []
            /*
            let insight_indice = Object.keys(data.insights).map(function(key){
                let labels = data.labels.map(function(label){
                    return label.toString()
                })
                return labels.indexOf(key)
            })*/

            let hightlight_index=""
            if(main_insight_key!="" && chart_datas[curr_dataset][main_chart_id]&&chart_datas[curr_dataset][main_chart_id].x == data.x &&data.labels.includes(main_insight_key)){
                hightlight_index = data.labels.indexOf(main_insight_key)
            }
            

            var pointRadius = item.data.map(x => 1);
            var pointBackgroundColor = item.data.map(x => colors[index].main);
            var pointBorderColor = item.data.map(x => colors[index].main);
 
            insight_indice.forEach(function(insight_index){
                pointRadius[insight_index] = 5
                pointBackgroundColor[insight_index]=colors[index].insight
                pointBorderColor[insight_index] = colors[index].insight
            })


            temp.pointBackgroundColor = pointBackgroundColor
            temp.pointRadius = pointRadius;
            temp.pointBorderColor = pointBorderColor

            if(Number.isInteger(hightlight_index)){
                temp.pointBackgroundColor[hightlight_index] = colors[0].hightlight
                temp.pointRadius[hightlight_index] = 4.5;
                temp.pointBorderColor[hightlight_index] = colors[0].hightlight_border
            }
            
        }else{
            temp.pointBackgroundColor = colors[index].main
            temp.pointBorderColor = colors[index].main
            temp.pointRadius = 1;
        }
        datasets.push(temp)
    });

    var chart = new Chart(element, {        
        type: data.type,
        data: {
          labels: data.labels,
          datasets: datasets
        },                         
        options: {
            legend: {
                onHover:function(e,legendItem){
                    $('#seq_filter'+curr_sheet_num.toString()).text("Filter : " + legendItem.text)
                    
                }
            },
            elements: {
                line: {
                    tension: 0
                }
            },
            tooltips:{
                callbacks:{
                    title:function(tooltipItem){
                        let title = data.labels[tooltipItem[0].index]
                        if(title.length>20){
                            start = 0
                            valid = true
                            result = []
                            while(valid){
                                if((start + 20)<title.length){
                                    result.push(title.substring(start,start+20))
                                    start +=20  
                                }else{
                                    valid = false
                                }
                            }
                            return result
                        }else{
                            return title
                        } 
                    },
                    label:function(tooltipItem){
                        var chart_id ='a_chart_'+element.getAttribute('id').substring(10)
                        chart_data = chart_datas[curr_dataset][chart_id]
                        
                        if (chart_data){
                            var modify_labels = Object.keys(chart_data.otherInfo).map(function(item){
                                item = item.toString()
                                if(item.length>10){
                                    return item.substring(0,10) + '...'
                                }else{
                                    return item
                                } 
                            })
    
                            if(modify_labels.includes(tooltipItem.xLabel)){
                                var multistringText = [tooltipItem.yLabel] 
                                //產生tooltip
                                var label_index = modify_labels.indexOf(tooltipItem.xLabel)
                                var one2oneList = Object.values(chart_data.otherInfo)[label_index]
                                Object.keys(one2oneList).forEach(function(key){
                                    let text = key + '=' + one2oneList[key]
                                    text = (text.length>20)? text.substring(0,20):text
                                    multistringText.push(text)
                                })

                                return multistringText
                                
                            }else{
                                return tooltipItem.yLabel
                            } 
                        }else{
                            return tooltipItem.yLabel
                        }
                        
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            onClick: function(evt, activeElements) {
                if(activeElements.length !=0 ){
                    //only click the chart int the seq container can get the recommendation
                    if(isInSeqContainer(id)){
                        $('.ui.three.column.grid').css("border","0px")

                        //get vis rec
                        var click_item = this.data.labels[activeElements[0]._index]
                        var chart_index = element.getAttribute('data-chartIndex')
                        
                        getVisRec(chart_index,click_item,this,chart_id) // -> 會換main canvas id

                        //hight light this block
                        var block = document.getElementById(chart_id+'-clone')
                        block.style.border = "2px #99BBFF solid"
                        
                        //move the explore view
                        var explore_view = document.getElementById("explore_view_"+curr_sheet_num.toString())
                        explore_view.style.top = block.style.top

                        //highlight click item
                        let insight_indice = Object.keys(data.insights).map(function(key){
                            let labels = data.labels.map(function(label){
                                return label.toString()
                            })
                            return labels.indexOf(key)
                        })
                     
                        var elementIndex = activeElements[0]._index;
                        this.data.datasets[0].pointBackgroundColor= this.data.datasets[0].pointBackgroundColor.map(function(color,index){
                            if(index!=elementIndex){
                                new_color = (color == colors[0].hightlight)? colors[0].main: color
                                //換insight
                                if(insight_indice.includes(index)){
                                    new_color = colors[0].insight
                                }  
                            }else{
                                new_color = colors[0].hightlight
                            }
                            return new_color
                        }) 
                        this.data.datasets[0].pointBorderColor= this.data.datasets[0].pointBorderColor.map(function(color,index){
                            if(index!=elementIndex){
                                new_color = (color == colors[0].hightlight_border)? colors[0].main: color  
                                //換insight
                                if(insight_indice.includes(index)){
                                    new_color = colors[0].insight
                                } 
                            }else{
                                new_color = colors[0].hightlight_border
                            }
                            return new_color
                        }) 
                        this.data.datasets[0].pointRadius= this.data.datasets[0].pointRadius.map(function(radius,index){
                            if(index!=elementIndex){
                                new_radius = (radius == 4.5)? 1 : radius  
                                //換insight
                                if(insight_indice.includes(index)){
                                    new_radius = 5
                                } 
                            }else{
                                new_radius = 4.5
                            }
                            return new_radius
                        }) 
                        this.update();
                    }
                }
            },
            scales: {
                xAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: data.x,
                    },
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 15
                    },
                    afterTickToLabelConversion : function(q){
                        for(var tick in q.ticks){
                            if(q.ticks[tick].length>10){
                                q.ticks[tick] = q.ticks[tick].substring(0,10) + '...'
                            }
                        }
                    }
                }],
                yAxes: [{
                    scaleLabel: {
                    display: true,
                    labelString: data.y
                    },
                    ticks: {
                        min: 0
                    },
                    afterTickToLabelConversion : function(q){
                        for(var tick in q.ticks){
                            if(data.y_glo_aggre == "per"){
                                var value = parseFloat(q.ticks[tick])
                                q.ticks[tick] = Math.round((value*100)).toString() + "%" ;
                            }else{
                                var value = parseInt(q.ticks[tick]) 
                                if(value>=1000 && value<1000000){
                                    q.ticks[tick] = parseInt(value / 1000).toString() + "K" ;
                                }else if(value>=1000000){
                                    q.ticks[tick] = parseInt(value / 1000000).toString() + "M" ;
                                }
                            }
                            
                        }
                    }
                }],
            }
        }
      });

    // store the chart index of the enumerateVizs
    element.setAttribute("data-chartIndex", data.chart_index);
}
function getVisRec(chart_index,click_item,chart_obj,chart_id){
    //check if already get the rec
    var chart_data = chart_datas[curr_dataset][chart_id]
    
    //if already get rec E2
    var has_rec = false
    if (curr_system =="Vispilot" && Object.keys(chart_data.rec).length>0){
        has_rec = true
    }

    if(!chart_data.rec.hasOwnProperty(click_item) ){
    //if(!chart_data.rec.hasOwnProperty(click_item) && !has_rec){ //若沒有拿過推薦
        //store the rec label
        if(Object.keys(label_data).length>1){
            var store_chart_data = chart_datas[curr_dataset][main_chart_id]
            if(store_chart_data){
                if(Object.keys(store_chart_data.insights).includes(main_insight_key.toString())){
                    var insight_text = store_chart_data.insights[main_insight_key.toString()]
                }else{
                    var insight_text ='none'
                }
                one_round_label = {
                    key:main_insight_key,
                    chart:main_chart_id,
                    insight: insight_text,
                    rec: store_chart_data.rec[main_insight_key] 
                }
                store_label_data[curr_dataset].push(one_round_label)
            }
        }

        //request data
        var chart_info = {}
        chart_info.chart_index = chart_index
        chart_info.click_item = click_item
        chart_info.label_data = label_data
        $.ajax({
            type: 'POST',
            //url:"https://sequencegeneration.herokuapp.com/",
            url:"http://127.0.0.1:5000/get_vis_rec",
            data:JSON.stringify(chart_info)

        }).done(function(responce){
            //rec_vis_data of a chart
            console.log(responce)  
            
            //update label_data
            if(Object.keys(responce).length!=0){
                //store_label_data

                
                label_data = {}
                Object.values(responce).forEach(function(item){
                    item.forEach(function(data){
                        label_data[data.chart_index] = 0.0
                    })
                })
                
                //store vis rec to canvas
                //判斷1-1mapping，把該圖新增"other info訊息"
                var otherInfo = {}
                for(let i=0;i<responce.type1.length;i++){
                    var labels = responce.type1[i].labels 
                    if(labels.length == 1){
                        responce.type1[i].is_selected=true
                        otherInfo[responce.type1[i].x] = labels[0]
                    }
                }
                if(Object.keys(otherInfo).length!=0){
                    chart_data.otherInfo[click_item] = otherInfo
                }

                //存到chart info 裡
                chart_data.rec[click_item] = responce
                
                //有成功，換insight key
                main_insight_key = click_item
                //set main canvas id
                main_chart_id = chart_id

                // dwaw type 1,2 chart
                drawRec(0,"1",responce)
                drawRec(0,"2",responce)

                
            }
        });
    }else{ //已經拿過了
        var responce = chart_data.rec[click_item]   
        if(Object.keys(responce).length!=0){
            Object.values(responce).forEach(function(item){
                item.forEach(function(data){
                    label_data[data.chart_index] = 0.0
                })
            })
            drawRec(0,"1",responce)
            drawRec(0,"2",responce)
            //有成功，換insight key
            main_insight_key = click_item
            //set main canvas id
            main_chart_id = chart_id
        }
/*
        if(has_rec){
            for(var prop in chart_data.rec) {
                if (chart_data.rec.hasOwnProperty(prop)) {
                    var responce = chart_data.rec[prop]
                }
            }
        }else{
            var responce = chart_data.rec[click_item]   
        }
        if(Object.keys(responce).length!=0){
            Object.values(responce).forEach(function(item){
                item.forEach(function(data){
                    label_data[data.chart_index] = 0.0
                })
            })
            drawRec(0,"1",responce)
            drawRec(0,"2",responce)
            //有成功，換insight key
            main_insight_key = click_item
            //set main canvas id
            main_chart_id = chart_id
        }

        */
    }    
}
function drawRec(start_index,type,data){
    var id_head = (type=="1")? "rec_chart1_":"rec_chart2_"
    var recs = (type=="1")? data.type1.filter(function(item){return !item.is_selected}) : data.type2.filter(function(item){return !item.is_selected})
    
    //record start index
    element = (type=="1")? document.getElementById('R1_pre'):document.getElementById('R2_pre')
    element.setAttribute('data-startIndex',start_index)

    for(i=0;i<3;i++){
        var id = id_head.concat((i+1).toString());
        try{
            // draw chart
            var vis_data = recs[start_index];
            start_index += 1;
            drawLine(vis_data,id);

        }catch{
            document.getElementById(getChartID(id)).style.visibility = "hidden";
            start_index += 1;
        }
    }    
}
function getChartContainerID(id){
    var chart_id = ""
    switch(id){
        case "seq_chart_1":
            chart_id = "seq_chart_col_1";
            break;
        case "rec_chart1_1":
            chart_id = "chart1_1";
            break;
        case "rec_chart1_2":
            chart_id = "chart1_2";
            break;
        case "rec_chart1_3":
            chart_id = "chart1_3";
            break;
        case "rec_chart2_1":
            chart_id = "chart2_1";
            break;
        case "rec_chart2_2":
            chart_id = "chart2_2";
            break;
        case "rec_chart2_3":
            chart_id = "chart2_3";
            break;
    }
    return chart_id
}
function getChartID(id){
    var chart_id = ""
    switch(id){
        case "seq_chart_1":
            chart_id = "a_chart_1";
            break;
        case "rec_chart1_1":
            chart_id = "a_chart1_1";
            break;
        case "rec_chart1_2":
            chart_id = "a_chart1_2";
            break;
        case "rec_chart1_3":
            chart_id = "a_chart1_3";
            break;
        case "rec_chart2_1":
            chart_id = "a_chart2_1";
            break;
        case "rec_chart2_2":
            chart_id = "a_chart2_2";
            break;
        case "rec_chart2_3":
            chart_id = "a_chart2_3";
            break;
    }
    return chart_id
}
function isInSeqContainer(canvas_id){
    var check_string = canvas_id.slice(0,10)
    if(check_string == "seq_chart_") {
        return true
    }else{
        return false
    }
}
function updateVisRecByPlusID(canvas_id){
    var start_index = 0
    var vis_rec_data = chart_datas[curr_dataset][main_chart_id].rec[main_insight_key]

    switch(canvas_id){
        case "rec_chart1_1":
        case "rec_chart1_2":
        case "rec_chart1_3":
            start_index = parseInt(document.getElementById('R1_pre').getAttribute('data-startIndex'))
            var target_data = vis_rec_data
            /*
            if(curr_system=="Our"){
                var target_data = vis_rec_data
            }else{
                var chart_data = chart_datas[curr_dataset][main_chart_id]
                for(var prop in chart_data.rec) {
                    if (chart_data.rec.hasOwnProperty(prop)) {
                        var target_data = chart_data.rec[prop]
                    }
                }
            }*/
            drawRec(start_index,"1",target_data)

            break;
        case "rec_chart2_1":
        case "rec_chart2_2":
        case "rec_chart2_3":
            var start_index = parseInt(document.getElementById('R2_pre').getAttribute('data-startIndex'))
            var target_data = vis_rec_data
            /*
            if(curr_system=="Our"){
                var target_data = vis_rec_data
            }else{
                var chart_data = chart_datas[curr_dataset][main_chart_id]
                for(var prop in chart_data.rec) {
                    if (chart_data.rec.hasOwnProperty(prop)) {
                        var target_data = chart_data.rec[prop]
                    }
                }
            }*/
            drawRec(start_index,"2",target_data)
            break;
    }
}

function formatLabel(str, maxwidth){
    var sections = [];
    var words = str.split(" ");
    var temp = "";

    words.forEach(function(item, index){
        if(temp.length > 0)
        {
            var concat = temp + ' ' + item;

            if(concat.length > maxwidth){
                sections.push(temp);
                temp = "";
            }
            else{
                if(index == (words.length-1))
                {
                    sections.push(concat);
                    return;
                }
                else{
                    temp = concat;
                    return;
                }
            }
        }

        if(index == (words.length-1))
        {
            sections.push(item);
            return;
        }

        if(item.length < maxwidth) {
            temp = item;
        }
        else {
            sections.push(item);
        }

    });

    return sections;
}


function cleanRecCanvas(){
   chart_id = ['a_chart1_1','a_chart1_2','a_chart1_3','a_chart2_1','a_chart2_2','a_chart2_3']
   chart_id.forEach(function(item,index,array){
       document.getElementById(item).style.visibility = "hidden"
   });
} 

function onYelloStarBtnClick(){
    var canvas = $(this).parents('.ui.three.column.grid').find("canvas")
    if(canvas.length!=0){
        $(this).toggleClass("outline")
        if(!$(this).hasClass("outline")){ //實心的
            var label = 0.3
            //把heart變空心
            var heart = $(this).parents('.ui.three.column.grid').find(".red.heart")
            heart.addClass("outline")

        }else{ //空心的
            var label = 0.6
        }
        var chart_index = canvas.attr('data-chartIndex')
        label_data[chart_index] = label

        //update chart data on the main canvas
        if(main_chart_id){
            var data = chart_datas[curr_dataset][main_chart_id].rec[main_insight_key]
            values = Object.values(data)
            keys = Object.keys(data)

            outerLoop:
            for(let i=0;i<values.length;i++){
                list = values[i]
                for(let j=0;j<list.length;j++){
                    if(list[j] && parseInt(list[j].chart_index) == chart_index){
                        chart_datas[curr_dataset][main_chart_id].rec[main_insight_key][keys[i]][j].label = label
                        break outerLoop
                    }
                }
            }
        }
        console.log(label_data)           
    }
}

function onRedHeartBtnClick(){
    var canvas = $(this).parents('.ui.three.column.grid').find("canvas")
    if(canvas.length!=0){
        $(this).toggleClass("outline")
        if(!$(this).hasClass("outline")){ //實心的
            var label = 1.0
            //把star變空心
            var star = $(this).parents('.ui.three.column.grid').find(".yellow.star")
            star.addClass("outline")

        }else{ //空心的
            var label = 0.6
        }
        //set label data
        var chart_index = canvas.attr('data-chartIndex')
        label_data[chart_index] = label
        
        //update chart data on the main canvas
        if(main_chart_id){
            var data = chart_datas[curr_dataset][main_chart_id].rec[main_insight_key]
            values = Object.values(data)
            keys = Object.keys(data)

            outerLoop:
            for(let i=0;i<values.length;i++){
                list = values[i]
                for(let j=0;j<list.length;j++){
                    if(list[j] && parseInt(list[j].chart_index) == chart_index){
                        chart_datas[curr_dataset][main_chart_id].rec[main_insight_key][keys[i]][j].label = label
                        break outerLoop
                    }
                }
            }
        }
        console.log(label_data)       
    }
}

function onGreyPlusBtnClick(){
    var canvas_id = $(this).parents('.ui.three.column.grid').find("canvas").attr('id')
    var chart_index = document.getElementById(canvas_id).getAttribute('data-chartIndex') 
    
    var label = 0.6
    label_data[chart_index] = label    

    // add chart to seq container
    var data = chart_datas[curr_dataset][main_chart_id].rec[main_insight_key]
    var target_data = data
    /*
    if(curr_system=="Our"){
        var target_data = data
    }else{
        var chart_data = chart_datas[curr_dataset][main_chart_id]
        for(var prop in chart_data.rec) {
            if (chart_data.rec.hasOwnProperty(prop)) {
                var target_data = chart_data.rec[prop]
            }
        }
    }  */  

    values = Object.values(target_data)
    keys = Object.keys(target_data)
    outerLoop:
    for(let i=0;i<values.length;i++){
        list = values[i]
        for(let j=0;j<list.length;j++){
            if(list[j] && parseInt(list[j].chart_index) == chart_index){
                chart_datas[curr_dataset][main_chart_id].rec[main_insight_key][keys[i]][j].is_selected=true
                    if(chart_datas[curr_dataset][main_chart_id].rec[main_insight_key][keys[i]][j].label == 0) chart_datas[curr_dataset][main_chart_id].rec[main_insight_key][keys[i]][j].label =label
                /*
                if(curr_system=="Our"){
                    chart_datas[curr_dataset][main_chart_id].rec[main_insight_key][keys[i]][j].is_selected=true
                    if(chart_datas[curr_dataset][main_chart_id].rec[main_insight_key][keys[i]][j].label == 0) chart_datas[curr_dataset][main_chart_id].rec[main_insight_key][keys[i]][j].label =label
                }else{
                    var chart_data = chart_datas[curr_dataset][main_chart_id]
                    for(var prop in chart_data.rec) {
                        if (chart_data.rec.hasOwnProperty(prop)) {
                            chart_datas[curr_dataset][main_chart_id].rec[prop][keys[i]][j].is_selected=true
                            if(chart_datas[curr_dataset][main_chart_id].rec[prop][keys[i]][j].label == 0) chart_datas[curr_dataset][main_chart_id].rec[prop][keys[i]][j].label =label
                        }
                    }
                }*/
                
                
                var chart_data = target_data[keys[i]][j]
                break outerLoop
            }
        }
    }
    addNewChart(chart_data)
    
    // update visRec info
    updateVisRecByPlusID(canvas_id)
    // add label data

}
function updateSeqViewByExloreView(){
    //update seq view (看誰是深的)
    
    selected_chart_id_list =  Array.from($('.the-parent.selected').map(function(item){
        return "#a_chart_" + $(this).attr('id').substring(5)
    }))
    tree_structure = tree_structures[curr_dataset][curr_sheet_num-1]
    new_tree_structure = {}

    Object.keys(tree_structure).forEach(function(item){
        
        if(selected_chart_id_list.includes(item)){
            var children = tree_structure[item].filter(function(child){
                return selected_chart_id_list.includes(child)
                
            })
            new_tree_structure[item] = children
        }
    })
    updateSeqView(new_tree_structure)
}
function nodeClick(this_obj,Nodes){
    if(this_obj.hasClass("selected")){ //要隱藏的
        console.log(this_obj.data('treenode').parentId)
        if(this_obj.data('treenode').parentId!=0){
            //transparent this node
            this_obj.css({'background-color':"transparent"});
            this_obj.removeClass("selected")
            
                                
            //hide all children node
            var stack = [this_obj]
            
            while(stack.length!=0){
                var $curr = stack.pop()
                var children_ids = $curr.data('treenode').children
                var childrens = Object.values(Nodes).filter(function(node){
                    var children_info = $('#'+node.id).data('treenode')
                    if(children_info && children_ids.includes(children_info.id)){
                        return node
                    }
                })
                if(childrens.length!=0){
                    for(let i=0;i<childrens.length;i++){
                        $('#'+childrens[i].id).css({'background-color':"transparent"});
                        $('#'+childrens[i].id).removeClass("selected")
                        stack.push($('#'+childrens[i].id))
                    }    
                }
            }
        }
    }else{ // 要show的
        //highlight this node
        this_obj.css({'background-color':"#AAAAAA"});
        this_obj.addClass("selected")
                            
        //highlight all parent node
        var stop = false
        var $curr = this_obj
        while(!stop){
            var parent_id = $curr.data('treenode').parentId
            var parent = Object.values(Nodes).filter(function(node){
                var parent_info = $('#'+node.id).data('treenode')
                if(parent_info && parent_info.id == parent_id){
                    return node
                }
            })

            if(parent.length!=0){
                $('#'+parent[0].id).css({'background-color':"#AAAAAA"});
                $('#'+parent[0].id).addClass("selected")
                $curr = $('#'+parent[0].id)

            }else{
                stop = true
            }
        }
    } 
    
    updateSeqViewByExloreView()
}

function nodeEvent(){
    
    var $oNodes = $('.the-parent').unbind("click");
    
    $oNodes.click(
        function(){nodeClick($(this),$oNodes)},
    );
    $oNodes.hover(function(){
        $(this).css({'width':'12px','height':'12px'});

    },function(){
        $(this).css({'width':'10px','height':'10px'});
    })
    $('.collapse-switch').remove()
}
function cleanSheet(){
    
}

function clean(){
    global_chart_id=0
    main_chart_id
    main_insight_key = ''
    sheet_num = 1
    curr_sheet_num=1
    label_data = {}
    //curr_dataset = ""
    explore_views = {}
    seq_views = {}
    tree_structures = {"generate":{}}
    chart_datas = {"generate":{}}
    store_label_data ={"generate":[]}

    //clean sheet container
    $('.ui.internally.celled.two.grid.column').remove()
    $('#chart_temp').children().remove()
    $('.ui.tabular.menu').children().remove()
    var tab = document.getElementById('tab')
    var ele_1 = document.createElement("a")
    setAttributes(ele_1,{class:"item active",id:"Sheet_1"})
    ele_1.innerHTML = "Sheet 1"
    var ele_2 = document.createElement("a")
    setAttributes(ele_2,{class:"item",id:"add_sheet"})
    var ele_3 = document.createElement("i")
    setAttributes(ele_3,{class:"plus icon"})
    ele_2.appendChild(ele_3)
    tab.appendChild(ele_1)
    tab.appendChild(ele_2)
}

function getNodeID(chart_index){
    //給chart_index 找chartID

    var return_key ="" 
    
    Object.keys(chart_datas[curr_dataset]).forEach(function(key){
        console.log("key: "+key)
        console.log("chart index: "+chart_datas[curr_dataset][key].chart_index)

        if(chart_datas[curr_dataset][key].chart_index == parseInt(chart_index)){
            return_key = key
        }
    })
    return return_key
}

function addNewCharts(new_chart_datas,tree_structure){
    //update all chart data
    Object.keys(new_chart_datas).forEach(function(chart_index){
        if(getNodeID(chart_index)!=main_chart_id || main_chart_id==""){
            ++global_chart_id
            var chart_id = "a_chart_".concat(global_chart_id.toString());
            
            //var chart_id = "a_chart_".concat(chart_index.toString());
            chart_datas[curr_dataset][chart_id] = new_chart_datas[parseInt(chart_index)]
            
            //create the pseudo element for the seq view tree
            var chart_temp =document.getElementById('chart_temp') 
            var chart_div = document.createElement("div")
            setAttributes(chart_div,{class:"ui three column grid",id:chart_id,style:"display: inline-block;width: 300px;height:280px;"})
            chart_temp.appendChild(chart_div)
        } 
    })
    
    //update seq structure
    format_tree ={}
    Object.keys(tree_structure).forEach(function(index){
        values = tree_structure[index].map(function(item){
            return "#"+getNodeID(item)
        })
        format_tree["#"+getNodeID(index)] =values        
    })

    try{
        curr_tree = tree_structures[curr_dataset][curr_sheet_num-1]
        Object.keys(format_tree).forEach(function(key){
            if(curr_tree.hasOwnProperty(key)){
                curr_tree[key].push(...format_tree[key])
            }else{
                curr_tree[key]=format_tree[key]
            }
            
        })
        tree_structures[curr_dataset][curr_sheet_num-1] = curr_tree
    }catch(e){
        tree_structures[curr_dataset][curr_sheet_num-1]=format_tree
    } 
    //update node structure
    curr_tree = tree_structures[curr_dataset][curr_sheet_num-1]
    node_structure = {}
    Object.keys(curr_tree).forEach(function(item){
        chart_list = curr_tree[item].map(function(index){
            return "node_"+index.substring(9)
        })
        node_structure["node_"+item.substring(9)] = chart_list
    })
    
    //check if the node is selected. only show the node which is selected
    //updateExpView(node_structure)
    seq_data={}
    seq_data.data=node_structure
    seq_data.node = true
    $.ajax({
        type: 'POST',
        url:"http://127.0.0.1:5000/get_seq_data",
        data:JSON.stringify(seq_data)
    }).done(function(responce){
        //console.log(responce)
        
        if(explore_views.hasOwnProperty(curr_sheet_num-1)){ //已經有tree了
            explore_views[curr_sheet_num-1].destroy()
        }
       //create tree
        var exp_tree_structure = {
            chart: {
                container: "#explore_view_"+curr_sheet_num.toString(), // div id
                callback : {
                    onTreeLoaded :nodeEvent
                },
                rootOrientation :"WEST",
                levelSeparation:    20,
                siblingSeparation:  30,
                subTeeSeparation:   30,
                nodeAlign: "BOTTOM",
                padding: 35,
                node: { 
                    HTMLclass: "evolution-tree",
                    collapsable: false
                },
                connectors: {
                    type: "curve",
                    style: {
                        "stroke-width": 2,
                        "stroke-linecap": "round",
                        "stroke": "#ccc"
                    }
                },
            },
            //nodeStructure:responce
            nodeStructure: {
                HTMLid:"root",
                pseudo:true,
                children:[responce]
            }
        };
        var explore_view = new Treant(exp_tree_structure,null,$);
        explore_views[curr_sheet_num-1]=explore_view

        //change color
        if(!selected_nodes[curr_dataset].hasOwnProperty(curr_sheet_num-1)){
            $('.the-parent').each(function(){
                $(this).css({'background-color':"#AAAAAA"});
                $(this).addClass("selected")  
            })
            
            selected_nodes[curr_dataset][curr_sheet_num-1] = Array.from($('.the-parent.selected').map(function(item){
                return $(this).attr('id')
            }))
        }else{
            selected_node_id_list = selected_nodes[curr_dataset][curr_sheet_num-1]

            $('.the-parent').each(function(){
                $(this).css({'background-color':"#AAAAAA"});
                $(this).addClass("selected")  
            })

            new_chart_list = Object.keys(new_chart_datas).map(function(item){
                return "node_"+getNodeID(item).substring(8)
            })
            $('.the-parent').each(function(){
                if((!selected_node_id_list.includes($(this).attr('id'))) && (!new_chart_list.includes($(this).attr('id')))){
                    $(this).css({'background-color':"transparent"});
                    $(this).removeClass("selected")  
                }
            })
        }
        
        //over flow
        $("#explore_view_"+curr_sheet_num.toString()).css("overflow","auto")

        //update seq
        updateSeqViewByExloreView()
    });
}

function show_sequence(seq_idx,dataset){
    data = {}
    data.seq_idx = seq_idx
    data.dataset = dataset
    //data = {"seq_idx": seq_idx,"dataset":dataset}
    $.ajax({
        type: 'POST',
        url:"http://127.0.0.1:5000/get_init_chart",
        data:JSON.stringify(data)

    }).done(function(responce){
        $("#seq_cost").text(responce.seq_cost)
        if(responce.tree_structure == null){
            $("#seq_num").text($("#seq_num").text() + "(none)")
        }else{
            //add a sheet 
            addSheetContainer()
            //add new chart
            addNewCharts(responce.chart_datas,responce.tree_structure)
            $("#col_1").css("display","none")
        }
    });
}

$(document).ready(function(){   
    $('.ui.dropdown').dropdown()
    $('.button').hover(function(){
        $(this).css("cursor","pointer")
    })

    //Split
    Split(['#seq_container', '#data_info'], {
        gutterSize: 3,
        minSize: [300, 200],
        direction: "vertical",
        cursor: 'row-resize',
    })
    $('.gutter').css({'width':"100%",'background': "#DDDDDD",'background-repeat':'no-repeat'})
    $('.gutter.gutter-vertical').css({"cursor":"row-resize","width":"100%"})
    $('.split.split-vertical').css({"width":"100%"})
    
    //get dataset options
    $.ajax({
        type: 'GET',
        url:"http://127.0.0.1:5000/get_datasets",
    }).done(function(responce){
        $('#dataset_dropdown').dropdown('change values',responce.datasets);
    });
    
    $('#show_seq').click(function(){
        //設定total seq num
        dataset = $('#dataset_dropdown').dropdown('get text');
        curr_seq_num = 0
        curr_dataset = dataset 

        data = {"dataset": dataset}

        $.ajax({
            type: 'POST',
            url:"http://127.0.0.1:5000/get_seq_num",
            data:JSON.stringify(data)
        }).done(function(responce){
            total_seq_num = responce.total_seq_num
            num_of_none = responce.num_of_none
            num_of_best = responce.num_of_best
            $("#num_of_none").text(num_of_none.toString() + "(" + ((num_of_none/total_seq_num).toFixed(2)*100)+"\t%)")
            $("#num_of_best").text(num_of_best.toString() + "(" + ((num_of_best/total_seq_num).toFixed(2)*100)+"\t%)")

            $("#total_seq_num").text(total_seq_num)
            $("#seq_num").text(curr_seq_num+1)
            show_sequence(curr_seq_num,dataset)
        });

    })

    // handle page button
    $('#pre').click(function(){
        if(curr_seq_num -1 >= 0) curr_seq_num-=1
        $("#seq_num").text(curr_seq_num+1)
        clean()
        show_sequence(curr_seq_num,curr_dataset)
    })
    $('#next').click(function(){
        if(curr_seq_num +1 < total_seq_num) curr_seq_num+=1
        $("#seq_num").text(curr_seq_num+1)
        clean()
        show_sequence(curr_seq_num,curr_dataset)
    })

    /*
    $('#change_user').click(function(){
        //store data
        var data = {}
        data.store_dataset = curr_dataset   
        data.store_structure = tree_structures[curr_dataset]
        data.store_label_data = store_label_data[curr_dataset]
        data.store_chart_data = chart_datas[curr_dataset]
        data.dataset = $('#dataset_dropdown').dropdown('get text')
        data.system = $('#system').dropdown('get text')

        //clean server data
        $.ajax({
            type: 'POST',
            //url:"https://sequencegeneration.herokuapp.com/",
            url:"http://127.0.0.1:5000/change_user",
            data:JSON.stringify(data)
        }).done(function(responce){
            clean()
        });
    })
    */

    /*
    //Add a chart btn. Show the axis selection card
    $('#add_a_chart_btn').click(function(){
        //set column depend on the selected dataset
        var changed_dataset = $('#dataset_dropdown').dropdown('get text')
        var from_scratch = ($('#from_scratch').dropdown('get text')=== "From_scratch") ? true : false
        var system = ($('#system').dropdown('get text')== "E1") ? "Our": "Vispilot"
        curr_system = system
        var data = {}
         
        if(changed_dataset!=curr_dataset){// 若換資料
            //存檔
            data.store_dataset = curr_dataset   
            data.store_structure = tree_structures[curr_dataset]
            data.store_label_data = store_label_data[curr_dataset]
            data.store_chart_data = chart_datas[curr_dataset]
        
            //clean UI
            clean()
            //change dataset
            curr_dataset = changed_dataset

            
        }
        data.dataset_name = changed_dataset
        data.from_scratch = from_scratch
        data.system = system
        $.ajax({
            type: 'POST',
            //url:"https://sequencegeneration.herokuapp.com/",
            url:"http://127.0.0.1:5000/get_options",
            data:JSON.stringify(data)
        }).done(function(responce){
            //change options
            $('#x_axis').dropdown('change values',responce.x_axis);
            $('#x_axis').children('.default.text').text(responce.x_default)
            $('#y_axis').dropdown('change values',responce.y_axis);
            $('#y_axis').children('.default.text').text(responce.y_default)
            
            // show card
            document.getElementById('add_a_chart_card').style.visibility="visible"    
        });
        
    })
    */
    
    /*
    //Add a chart confirm btn. Show a user selected chart
    $('#add_a_chart_confirm_btn').click(function(){
        var chart_info = {}
        chart_info.x = $('#x_axis').dropdown('get text');
        chart_info.y = $('#y_axis').dropdown('get text');
        document.getElementById('init').style.display = "none"
        document.getElementById('add_a_chart_card').style.visibility = "hidden"
        
        $.ajax({
            type: 'POST',
            //url:"https://sequencegeneration.herokuapp.com/",
            url:"http://127.0.0.1:5000/get_init_chart",
            data:JSON.stringify(chart_info)
        }).done(function(responce){
            //add a sheet 
            addSheetContainer()
            //add explore view
            addExploreView()
            //add new chart
            addNewChart(responce)
        });
       
    })
    */

    
    
    /*
    //Handle grey plus button add chart to seq_view from visRec
    $('.grey.plus.icon').click(onGreyPlusBtnClick)
    $('.red.heart.icon').click(onRedHeartBtnClick)
    $('.yellow.star.icon').click(onYelloStarBtnClick)
    */
    
    /*
    //Sheet controller
    $('.ui.tabular.menu').on('click', '.item', function() {
        if($(this).attr('id')!="add_sheet") {
          //change sheet 
          $(this).addClass('active').siblings('.item').removeClass('active');
          
          //hide old sheet container
          var sheet_container = document.getElementById('sheet_container_'+curr_sheet_num.toString())
          if (sheet_container) sheet_container.style.display = "none"
          //clean rec result
          cleanRecCanvas()
          
          //show curr seq container
          curr_sheet_num = $(this).attr('id').substring(6)  
          sheet_container = document.getElementById('sheet_container_'+curr_sheet_num.toString())
          if(sheet_container)
          {
            sheet_container.style.display = "block"
              //hide init if it has the container
              document.getElementById('init').style.display="none"
              //change dataset
              var sheet_dataset = sheet_container.getAttribute('data-dataset')
              if(sheet_dataset!= curr_dataset){
                  $('#dataset_dropdown').dropdown('set text',sheet_dataset)
                  curr_dataset = sheet_dataset
                  
                  var data = {}
                  data.dataset_name = sheet_dataset
                  $.ajax({
                      type: 'POST',
                      //url:"https://sequencegeneration.herokuapp.com/",
                      url:"http://127.0.0.1:5000/update_dataset",
                      data:JSON.stringify(data)
                  }).done(function(responce){
                      label_data = {}
                      
                  });
              }
          }else{
              //show init if it doesn't have the container
              document.getElementById('init').style.display="block"
              document.getElementById('add_a_chart_card').style.visibility = "hidden"
          } 
  
        }else{//點到add sheet

          //hide current sequence container
          var sheet_container = document.getElementById('sheet_container_'+curr_sheet_num.toString())
          if (sheet_container) sheet_container.style.display = "none"
          //clean rec result
          cleanRecCanvas()
   
          //show "init" div 
          document.getElementById('init').style.display="block"
          document.getElementById('add_a_chart_card').style.visibility = "hidden"
  
          // add new sheet. init 
          sheet_num++
          curr_sheet_num = sheet_num
          let sheet_id = "Sheet_" + sheet_num.toString()
          let text = "Sheet " + sheet_num.toString()
          $('#add_sheet').before("<a class=\"item\" id=\""+sheet_id +"\">"+ text+"</a>")
          $("#" + sheet_id).addClass('active').siblings('.item').removeClass('active');
        }
      });
    */
})