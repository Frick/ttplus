var tomatoes;
var SVG;
var nodes = [];
var force;
var time = 100;
var gravity=10;
function initTomatoes(){
    SVG = d3.select("body").append("svg");
    SVG.attr("width",1920);
    SVG.attr("height",1080);
    //here we will set mouse click function events for any mouse movementinside the SVG box in the window
    SVG.on("mousedown", function() {
           pointer = d3.svg.mouse(this);
           mouseClickedX = pointer[0];
           mouseClickedY = pointer[1];
           throwTomato(mouseClickedX,mouseClickedY,50- Math.random()*30,50-Math.random()*30);
           
    });
			//declare a variable to hold the circles, circles will be added for each datapoint from the enter().append() function
            
                
        //the D3 FORCE layout will provide a physics point charge simulation, including charge and gravity
    force = d3.layout.force().nodes(nodes)
        }
function getXposition(o){
    xpos=o.startX+o.velx*o.time;
   
    
    return xpos;
}
function updateTomatoTime(o){
     o.time+=o.baseTime/o.timeFactor;
}
function getYposition(o){
    o.vely = o.startVelY+gravity*o.time;
    ypos=o.startY+o.vely*o.time;
    
    return ypos
}
    function throwTomato(startX, startY, finalX, finalY){
        pos=[];
        time=0;
        baseTime =4;
        timeFactor=50;
        finalDistY=(finalY-startY)*(finalY-startY);
        finalDistX =(finalX-startX)*(finalX-startX);
        
        dist = Math.sqrt(finalDistY + finalDistX);
        xpos = startX;
        ypos = startY;
        
        if(dist>350){
            timeFactor*=1.5;
        }
        startVelY=(-5*baseTime*baseTime+finalY-startY)/baseTime;
        vely=startVelY;
        velx = (finalX-startX)/baseTime;
        
              
        nodes.push({startVelY: startVelY, velx: velx, vely: vely, time:time, timeFactor: timeFactor, baseTime: baseTime,  startX: startX, startY: startY, alive:true});
        
        tomatoes = SVG.selectAll("image.tomato").data(nodes)
        //the attribute "r" corisponds to the radius of the circle
        .enter().append("image")
        .attr("xlink:href", "../images/tomato.png")
        .attr("width", 25)
        .attr("height", 25)
        .attr("class","tomato")
        .attr("x",function(d){
              return d.startX;
              })
        //this sets the center of the circle's Y coordinates
        .attr("y",function(d){
              return d.startY;
              });
        

        force.alpha(1).start();
        
        force.on("tick", function(e) {
                 nodes.forEach(function(o, i) {

                               if(o.time<o.baseTime){
                                    o.yi = getYposition(o);
                                    o.xi = getXposition(o);
                                    updateTomatoTime(o);
                                    SVG.selectAll("image.tomato").transition().duration(1)
                                        .attr("x", function(d) {
                                              return d.xi;
                                              })
                                    .attr("y", function(d) {
                                          return d.yi;
                                     })
                               

                               
                               }
                               else{
                               
                                SVG.selectAll("image.tomato")
                               .attr("xlink:href", function(d){
                                     if(d.time>d.baseTime){
                                            d.alive=false;
                                            if(nodes.length>15)
                                                nodes.splice(0,1);
                                            return  "../images/splat.png";
                                        }
                                        else{
                                            return "../images/tomato.png";
                                        }
                               });
                                    //nodes.splice(i,i+1);
                               
                                    SVG.selectAll("image.tomato").data(nodes).exit().remove();
                               }
                             
                                //the nodes array corresponding to each circle
                                                                     

                               });
                 });
        force.start();
      
        function clearTomatoes(){
            nodes=[];
            tomatoes.data(nodes).exit().remove();
        }
      
                            //this section is needed to refresh the actual position value of the circles, as before we were simply modifying the data contained within
                                   


    }
