////// chart.js 
// define the options of line chart 
// used in creating chart.js object

//options
function line_options(element,data,canvas_id,chart_id,chart_datas){
    y_subset_max = 0
    y_overall_max = 0
    data.datas.forEach(function(item,i){
        if(i==0){
            y_subset_max = Math.max(...item.data) 
        }else{
            y_overall_max = Math.max(...item.data) 
        }
    })
    y_max = 0
    if(Math.abs(y_overall_max-y_subset_max)>10000000){
        y_max = y_subset_max

    }else{
        y_max = (y_overall_max>y_subset_max)?y_overall_max:y_subset_max
    }
    
    var options = { 
        // Container for pan options
        plugins: {
            zoom: {
                pan: {
                    enabled: true,
                    mode: 'x',
                    rangeMin: {
                        y: 0
                    },
                },
                zoom: {
                    enabled: true,
                    sensitivity: 0.001,
                    speed: 10,
                    mode: 'x',
                    rangeMin: {
                        y: 0
                    },
                    rangeMax: {
                        y: 500
                    },
                    
                }
            }
        },
        legend:{
            display:false
        },
        elements: {
            line: {
                tension: 0
            }
        },
        tooltips:{
            displayColors: false,
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
                label:function(tooltipItem,data){
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
                            if (tooltipItem.yLabel == ""){
                                value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index]
                                return Math.floor(value*100) + "%"
                            }
                            return tooltipItem.yLabel
                        } 
                    }else{
                        if (tooltipItem.yLabel == ""){
                            value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index]
                            return Math.floor(value*100) + "%"
                        }
                        return tooltipItem.yLabel
                    }
                    
                }
            }
        },
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            xAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: data.x,
                    fontStyle: "bold",
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
                labelString: data.y,
                fontStyle: "bold"
                },
                position:"left",
                ticks: {
                    min: 0
                },
                afterTickToLabelConversion : function (q){
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
            },{
                id: 'overall',
                position:"right",
                display: false,
                ticks: {
                    min: 0
                },
                afterTickToLabelConversion : function (q){
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
            }
            ],
        }
    }

    
    //show second y-axes if there are two dataset
    if(data.datas.length>1){
        options.scales.yAxes[1].display = true
    }
    
    return options
}

function line_datasets(data,chart_datas){
    datasets = []
    chart_type = data.type
    data.datas.forEach(function(item,index,array){
        var temp = {}
        temp.data = item.data;
        temp.label = item.label
        temp.borderColor = chart_colors[chart_type][index].main;
        temp.fill = false
        temp.pointBorderWidth = 2
        
        if(index==0){
            // get clicked index
            let clicked_index=""
            if(main_insight_key!="" && chart_datas[curr_dataset][main_chart_id]&&chart_datas[curr_dataset][main_chart_id].x == data.x &&data.labels.includes(main_insight_key)){
                clicked_index = data.labels.indexOf(main_insight_key)
            }
            
            var pointRadius = item.data.map(x => 2);
            var pointBackgroundColor = item.data.map(x => chart_colors[chart_type][index].main);
            var pointBorderColor = item.data.map(x => chart_colors[chart_type][index].main);
            

            // get insight indice
            if(data.insights){
                let insight_indice = Object.keys(data.insights).map(function(key){
                    let labels = data.labels.map(function(label){
                        return label.toString()
                    })
                    return labels.indexOf(key)
                })
    
                // change insight dot style
                insight_indice.forEach(function(insight_index){
                    pointRadius[insight_index] = 5
                    
                    pointBackgroundColor[insight_index]=chart_colors[chart_type][index].main
                    pointBorderColor[insight_index] = chart_colors[chart_type][index].insight_border
                })
            }
          
            temp.pointBackgroundColor = pointBackgroundColor
            temp.pointRadius = pointRadius;
            temp.pointBorderColor = pointBorderColor
            

            if(Number.isInteger(clicked_index)){
                temp.pointBackgroundColor[clicked_index] = chart_colors[chart_type][0].click
                temp.pointBorderColor[clicked_index] = chart_colors[chart_type][0].click_border
                temp.pointRadius[clicked_index] = 5;
                
            }
        
        }else{
            // add id (for the right yAxes)
            temp.yAxisID = "overall"

            temp.pointBackgroundColor = chart_colors[chart_type][index].main
            temp.pointBorderColor = chart_colors[chart_type][index].main
            temp.pointRadius = 1;
        }
        datasets.push(temp)
    });
    return datasets
}