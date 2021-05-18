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
var chart_objects = {}
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
            //add a sheet(create a new story) 
            addSheetContainer()
            
            //create new charts div
            createNewChartsDiv(responce.chart_datas)

            //create tree structure for the treant lib
            createTreeStructures(responce.tree_structure)
            
            // draw tree, 1. add elements of each chart 2. draw chart
            drawTree(tree_structures[curr_dataset][curr_sheet_num-1])
        }
    });
}

function addSheetContainer(){
    main_chart_id =''
    
    // detect if sheet exist
    var sheet_container = document.getElementById('sheet_container_'+curr_sheet_num)
    if (sheet_container){
        sheet_container.style.display = "block"
    }else{
        // add elements into sequence container
        var tree_container = document.getElementById('tree_container')
        var sheet_container = sheetContainer(curr_dataset,curr_sheet_num)
        tree_container.append(sheet_container)
    } 
}

function createNewChartsDiv(new_chart_datas){
    //create div for each chart
    Object.keys(new_chart_datas).forEach(function(chart_index){
        ++global_chart_id
        var chart_id = "a_chart_".concat(global_chart_id.toString());
        chart_datas[curr_dataset][chart_id] = new_chart_datas[parseInt(chart_index)]
            
        //create the pseudo element for the seq view tree
        var chart_temp =document.getElementById('chart_temp') 
        var chart_div = document.createElement("div")
        setAttributes(chart_div,{id:chart_id,style:"display: inline-block;width: 300px;height:280px;"})
        chart_temp.appendChild(chart_div)
    })
}

function createTreeStructures(tree_structure){
    //use dict to store parent-child relation with chart div id
    format_tree ={}
    Object.keys(tree_structure).forEach(function(index){
        values = tree_structure[index].map(function(item){
            return "#"+getNodeID(item)
        })

        let par_id = (index == -1)? "root" : "#"+getNodeID(index)

        format_tree[par_id] =values        
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
        // store tree structure if it doesn't exist
        tree_structures[curr_dataset][curr_sheet_num-1]=format_tree
    }
}

function drawTree(tree_structure){
    seq_data={}
    seq_data.data=tree_structure
    $.ajax({
        type: 'POST',
        url:"http://127.0.0.1:5000/get_seq_data",
        data:JSON.stringify(seq_data)
    }).done(function(responce){
      
        if(seq_views.hasOwnProperty(curr_sheet_num-1)){ //已經有tree了
            seq_views[curr_sheet_num-1].destroy()
        }

        //create tree
        var seq_tree_structure =  seqTreeStructure(curr_sheet_num,responce)
        var seq_view = new Treant(seq_tree_structure,null,$);
        seq_views[curr_sheet_num-1]=seq_view
        
        //create the update chart id list
        var chart_id_list = Object.keys(tree_structure)

        //add element and draw canvas
        for(let i=0;i<chart_id_list.length;i++){
            let chart_id = chart_id_list[i].substring(1)
            var chart_div = document.getElementById(chart_id+'-clone')
            var canvas_id =  "seq_chart_".concat(chart_id.substring(8))
            var chart_data = chart_datas[curr_dataset][chart_id]
            
            addElement(chart_div,canvas_id,chart_data)
            drawChart(chart_data,canvas_id,chart_id)
        }
    });    
}

function drawChart(data,canvas_id,chart_id=""){
    
    //update canvas
    updateCanvasElement(canvas_id)
    
    //get canvas
    var element = document.getElementById(canvas_id)

    var chart_type = data.type
    // create chart.js information
    if(chart_type == "bar"){
        options = bar_options(element,data,canvas_id,chart_id,chart_datas)
        datasets = bar_datasets(data,chart_datas)
    }else if(chart_type == "line"){
        options = line_options(element,data,canvas_id,chart_id,chart_datas)
        datasets = line_datasets(data,chart_datas)
    }
    //create chart.js object
    var chart = new Chart(element,{
        type: chart_type,
        data: {
            labels: data.labels,
            datasets: datasets
        },    
        options: options
    });

    // store chart object
    var id = (chart_id!="")? chart_id :canvas_id
    chart_objects[id] = chart

    // store the chart index of the enumerateVizs
    element.setAttribute("data-chartIndex", data.chart_index);
}

function getNodeID(chart_index){
    //給chart_index 找chartID

    var return_key ="" 
    
    Object.keys(chart_datas[curr_dataset]).forEach(function(key){
        //console.log("key: "+key)
        //console.log("chart index: "+chart_datas[curr_dataset][key].chart_index)

        if(chart_datas[curr_dataset][key].chart_index == parseInt(chart_index)){
            return_key = key
        }
    })
    return return_key
}

 
function onResetZoom(){
    // dimmer
    var chart_id = $(this).parents('.ui.three.column.grid.node')[0].id.split("-")[0]
    var myChart = chart_objects[chart_id]
    myChart.resetZoom();
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
    //$('.ui.internally.celled.two.grid.column').remove()
    $('#chart_temp').children().remove()
    
    /*
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
    */
}

function updateCurrSeqNum(){
    curr_seq_num = $("#seq_num").val()
    curr_seq_num = parseInt(curr_seq_num)
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
        $("#seq_num").val(curr_seq_num)

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
            
            //updateCurrSeqNum()
            $("#seq_num").val(curr_seq_num)
            
            show_sequence(curr_seq_num,dataset)
        });

    })

    // handle page button
    $('#pre').click(function(){
        //updateCurrSeqNum()
        if(curr_seq_num -1 >= 0) curr_seq_num-=1
        $("#seq_num").val(curr_seq_num)
        clean()
        show_sequence(curr_seq_num,curr_dataset)
    })
    
    $('#next').click(function(){
        //updateCurrSeqNum()
        if(curr_seq_num +1 < total_seq_num) curr_seq_num+=1
        $("#seq_num").val(curr_seq_num)
        clean()
        show_sequence(curr_seq_num,curr_dataset)
    })
    
    $('#seq_go_btn').click(function(){
        updateCurrSeqNum()
        clean()
        show_sequence(curr_seq_num,curr_dataset)
    })


})