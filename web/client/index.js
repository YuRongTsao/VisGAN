//global var
var curr_seq_num = 0
var total_seq_num = 800
var curr_dataset = ""
var global_chart_id=0
var main_chart_id
var main_insight_key = ''
var sheet_num = 1
var curr_sheet_num=1
var seq_views = {}
var tree_structures = {
    "generate":{},
    
}
var chart_datas = {
    "generate":{},
}

 function show_sequence(seq_idx,dataset){
    data = {}
    data.seq_idx = seq_idx
    data.dataset = dataset
   
    $.ajax({
        type: 'POST',
        url:"http://127.0.0.1:5000/get_init_chart",
        data:JSON.stringify(data)

    }).done(function(responce){
        $("#seq_cost").text(responce.seq_cost)
        if(responce.tree_structure == null){
            $("#seq_num").val($("#seq_num").val() + "(none)")
        }else{
            //add a sheet 
            addSheetContainer()
            
            //add new chart
            addNewCharts(responce.chart_datas,responce.tree_structure)
        }
    });
}

 function addSheetContainer(){
    main_chart_id =''
    var sheet_container_id = 'sheet_container_'+curr_sheet_num.toString()
    var seq_view_id = 'seq_view_'+curr_sheet_num.toString()
    var seq_container = document.getElementById('tree_container')
    var sheet_container = document.createElement("div")
    setAttributes(sheet_container,{"data-dataset":curr_dataset,"class":"ui internally celled two grid column","id":sheet_container_id, "style":"height:100%"})
  
    var seq_view = document.createElement("div")
    setAttributes(seq_view,{"style":"clear: left;"})
    setAttributes(seq_view,{"id":seq_view_id,"style":"overflow-x:auto"})

    seq_container.appendChild(sheet_container)
    sheet_container.append(seq_view)
}

function addNewCharts(new_chart_datas,tree_structure){
    //update all chart data
    Object.keys(new_chart_datas).forEach(function(chart_index){
        if(getNodeID(chart_index)!=main_chart_id || main_chart_id==""){
            ++global_chart_id
            var chart_id = "a_chart_".concat(global_chart_id.toString());
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


    updateSeqView(tree_structures[curr_dataset][curr_sheet_num-1])
}


function updateSeqView(tree_structure){
    seq_data={}
    seq_data.data=tree_structure
    $.ajax({
        type: 'POST',
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
    
    var new_row_2 = document.createElement("div")
    setAttributes(new_row_2,{class:"row"})
    var new_col_3 = document.createElement("div")
    setAttributes(new_col_3,{class:"column"})

    // add html
    chart_div.appendChild(new_row)
    new_row.appendChild(new_col)
    new_col.appendChild(new_canvas)
    
    new_row.appendChild(new_col_1)
    new_col_1.appendChild(new_row_1)
    new_row_1.appendChild(new_col_2)

    new_col_1.appendChild(new_row_2)
    new_row_2.appendChild(new_col_3)
   
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

function isInSeqContainer(canvas_id){
    var check_string = canvas_id.slice(0,10)
    if(check_string == "seq_chart_") {
        return true
    }else{
        return false
    }
}

function clean(){
    global_chart_id=0
    main_chart_id
    main_insight_key = ''
    sheet_num = 1
    curr_sheet_num=1
    //curr_dataset = ""
    seq_views = {}
    tree_structures = {"generate":{}}
    chart_datas = {"generate":{}}
    

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

$(document).ready(function(){   
    $('.ui.dropdown').dropdown()
  
    //get dataset options
    $.ajax({
        type: 'GET',
        url:"http://127.0.0.1:5000/get_datasets",
    }).done(function(responce){
        $('#dataset_dropdown').dropdown(responce.datasets);
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
            $("#seq_num").val(curr_seq_num+1)
            
            show_sequence(curr_seq_num,dataset)
        });

    })

    // handle page button
    $('#pre').click(function(){
        if(curr_seq_num -1 >= 0) curr_seq_num-=1
        $("#seq_num").val(curr_seq_num+1)
        clean()
        show_sequence(curr_seq_num,curr_dataset)
    })
    $('#next').click(function(){
        if(curr_seq_num +1 < total_seq_num) curr_seq_num+=1
        $("#seq_num").val(curr_seq_num+1)
        clean()
        show_sequence(curr_seq_num,curr_dataset)
    })

})