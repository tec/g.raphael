/*!
 * Radar charts for g.Raphael 0.51 - Charting library, based on Raphaël
 *
 * Copyright (c) 2009-2013
 *   Silvan T. Golega, Pidoco GmbH
 *   Kevin Yank, Avalanche Technology Group
 *   Dmitry Baranovskiy (http://g.raphaeljs.com)
 *
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 */

 /*
 * radarchart method on paper
 */
/*\
 * Paper.radarchart
 [ method ]
 **
 * Creates a radar chart
 **
 > Parameters
 **
 - cx (number) x coordinate of the chart
 - cy (number) y coordinate of the chart
 - r (integer) radius of the chart
 - values (array) values used to plot
 - opts (object) options for the chart
 o {
 o helplines (integer) number of circular helper lines [default `5`]
 o circleradius (number) radius of each data point [default `10`]
 o stroke (string) color of the circle stroke in HTML color format [default `"#FFF"`]
 o strokewidth (integer) width of the chart stroke [default `1`]
 o meshcolor (string) color of the background mesh in HTML color format [default `"#FFF"`]
 o meshwidth (integer) width of the background mesh [default `1`]
 o href (array) urls to to set up clicks on chart slices
 o legend (array) array containing strings that will be used in a legend. Other label options work if legend is defined.
 o legendcolor (string) color of text in legend [default `"#000"`]
 o legendothers (string) text that will be used in legend to describe options that are collapsed into 1 slice, because they are too small to render [default `"Others"`]
 o legendmark (string) symbol used as a bullet point in legend that has the same colour as the chart slice [default `"circle"`]
 o legendpos (string) position of the legend on the chart [default `"east"`]. Other options are `"north"`, `"south"`, `"west"`
 o numbers (boolean) indicate whether to identify data points using ids (in the plot and in the legend) [default: `true`]
 o numberscolor (string) color for the data point ids [`"#FFF"`]
 o }
 **
 = (object) path element of the popup
 > Usage
 | r.radarchart(cx, cy, r, values, opts)
 \*/

(function() {
    function Radarchart(paper, cx, cy, r, values, opts) {
        opts = opts || {};

        var chartinst = this,
            arms = [],                      // holds the values, their positions, paths, arms, circles
            chart = paper.set(),            // the chart that will be constructed and returned
            covers = paper.set(),           // holds the areas for event handling
            series = paper.set(),
            middle_point,                   // raphael circle for background mesh
            mesh = paper.set(),             // the background mesh
            total = 0,
            max = Math.max.apply(Math, values), // the maximum of the values
            len = values.length,            // number of values
            web = {pointarray: [], path: null}; // connecting lines between values
        
        // overwrite default values for options with opts
        var default_opts = {
            meshwidth:    1,
            strokewidth:  2,
            stroke:       "#f90",
            meshcolor:    "#999",
            helplines:    5,
            circleradius:   10,
            numbers:      true,
            numberscolor: "#fff"
        };
        for (var property in opts)
            default_opts[property] = opts[property];
        opts = default_opts;
        delete default_opts;
        
        // helper function for drawing an arm
        var arm = function (sx, sy, r, angle, m) {
            var rad = Math.PI / 180,
                cos = Math.cos(-angle * rad),
                sin = Math.sin(-angle * rad),
                x   = sx + r * cos,
                y   = sy + r * sin,
                ex  = sx + m * cos,
                ey  = sy + m * sin,
                res = {
                    x:          x,
                    y:          y,
                    //start:    {x: sx, y: sy},
                    //end:      {x: ex, y: ey},
                    path:       ["M", cx, cy, "L", x, y].join(','),
                    rest:       ["M", x, y, "L", ex, ey].join(','),
                };
            return res;
        }

        // calculate total of all values
        for (var i = len; i--;) {
            total +=+ values[i];
        }
        
        // draw middle point and mesh circles
        middle_point = paper.circle(cx, cy, 5).attr({stroke: opts.meshcolor, fill: opts.meshcolor, "stroke-width": opts.meshwidth});
        if (opts.helplines){
            var helpradius = r / opts.helplines;
            for (var i = 0; i < opts.helplines; i++) {
                mesh.push(paper.circle(cx, cy, helpradius*(i+1)).attr({stroke: opts.meshcolor, "stroke-width": opts.meshwidth}));
            }
        }
        
        // calculate the arms
        for (var i = 0; i < len; i++) {
            arms[i] = arm(cx, cy, r * values[i] / max, i * 360 / len, r);
        }
            
        // draw a polygon through the value points
        web.pointarray.push("M");
        for (var i = 0; i < len; i++) {
            web.pointarray.push(arms[i].x, arms[i].y, "L");
        }
        web.pointarray.push(arms[0].x, arms[0].y);
        web.path = paper.path(web.pointarray.join(',')).attr({stroke: opts.stroke, "stroke-width": opts.strokewidth, fill: opts.stroke, "fill-opacity": 0.4});
            
        // draw the value points (and arms) as latest to make sure they are the topmost
        for (var i = 0; i < len; i++) {
            arms[i].path =  paper.path(arms[i].path)
                                .attr({stroke: opts.stroke,     "stroke-width": opts.strokewidth});
            arms[i].rest =  paper.path(arms[i].rest)
                                .attr({stroke: opts.meshcolor, "stroke-width": opts.meshwidth});
            arms[i].point = paper.circle(arms[i].x, arms[i].y, opts.circleradius)
                                .attr({stroke: opts.stroke, fill: opts.stroke });
            if(opts.numbers){
                arms[i].number = paper.text(arms[i].x, arms[i].y+1, i+1).attr(chartinst.txtattr).attr({fill: opts.numberscolor, "text-anchor": "middle"});
            }
            if (opts.href && opts.href[i]) {
              arms[i].path.attr({ href: opts.href[i] });
              arms[i].rest.attr({ href: opts.href[i] });
              arms[i].point.attr({ href: opts.href[i] });
              opts.numbers && arms[i].number.attr({ href: opts.href[i] });
            }
            var cover = paper.set();
            cover.push(arms[i].path, arms[i].rest, arms[i].point);
            if (arms[i].number)
              cover.push(arms[i].number);
            covers.push(cover);
            series.push(arms[i].point);
        }

        chart.hover = function (fin, fout) {
            fout = fout || function () {};
            var that = this;
            for (var i = len; i--;) {
                (function (arm, cover, j) {
                    var o = {
                        arm: arm.point,
                        number: arm.number,
                        cover: cover,
                        cx: cx,
                        cy: cy,
                        mx: arm.x,
                        my: arm.y,
                        value: values[j],
                        max: max,
                        label: that.labels && that.labels[j]
                    };
                    o.cover.mouseover(function () {
                        fin.call(o);
                    }).mouseout(function () {
                        fout.call(o);
                    });
                    if (o.label){
                        o.label.mouseover(function () {
                            fin.call(o);
                        }).mouseout(function () {
                            fout.call(o);
                        });
                    }
                })(arms[i], covers[i], i);
            }
            return this;
        };

        // x: where label could be put
        // y: where label could be put
        // value: value to show
        // total: total number to count %
        chart.each = function (f) {
            if (!Raphael.is(f, "function")) {
                return this;
            }
            var that = this;
            for (var i = len; i--;) {
                (function (arm, cover, j) {
                    var o = {
                        arm: arm.point,
                        number: arm.number,
                        cover: cover,
                        cx: cx,
                        cy: cy,
                        x: arm.x,
                        y: arm.y,
                        value: values[j],
                        max: max,
                        label: that.labels && that.labels[j]
                    };
                    f.call(o);
                })(arms[i], covers[i], i);
            }
            return this;
        };
     
        chart.click = function (f) {
            var that = this;
            for (var i = len; i--;) {
                (function (arm, cover, j) {
                    var o = {
                        arm: arm.point,
                        number: arm.number,
                        cover: cover,
                        cx: cx,
                        cy: cy,
                        mx: arm.x,
                        my: arm.y,
                        value: values[j],
                        max: max,
                        label: that.labels && that.labels[j]
                    };
                    cover.click(function () { f.call(o); });
                    if (o.label){
                        o.label.click(function () {
                            f.call(o);
                        });
                    }
                })(arms[i], covers[i], i);
            }
            return this;
        };

        var legend = function (labels, otherslabel, mark, dir) {
            var x = cx + r + r / 5,
                y = cy,
                h = y + 10;
            
            labels = labels || [];
            dir = (dir && dir.toLowerCase && dir.toLowerCase()) || "east";
            mark = paper[mark && mark.toLowerCase()] || "circle";
            chart.labels = paper.set();

            for (var i = 0; i < len; i++) {
                var clr = series[i].attr("fill"),
                    txt;
                
                values[i].others && (labels[j] = otherslabel || "Others");
                labels[i] = chartinst.labelise(labels[i], values[i], total);
                chart.labels.push(paper.set());
                chart.labels[i].push(paper[mark](x + 5, h, 8).attr({fill: clr, stroke: "none"}));
                chart.labels[i].push(txt = paper.text(x + 20, h, labels[i] || values[i]).attr(chartinst.txtattr).attr({fill: opts.legendcolor || "#000", "text-anchor": "start"}));
                if(opts.numbers){
                    chart.labels[i].push(paper.text(x + 5, h + 1, i + 1).attr(chartinst.txtattr).attr({fill: opts.numberscolor, "text-anchor": "middle"}));
                }
                if (opts.href && opts.href[i]) {
                    for (var j = 0; j< chart.labels[i].length; j++) {
                      chart.labels[i][j].attr({ href: opts.href[i] });
                    }
                }
                covers[i].label = chart.labels[i];
                h += txt.getBBox().height * 1.2;
            }

            var bb = chart.labels.getBBox(),
                tr = {
                    east: [0, -bb.height / 2],
                    west: [-bb.width - 2 * r - 20, -bb.height / 2],
                    north: [-r - bb.width / 2, -r - bb.height - 10],
                    south: [-r - bb.width / 2, r + 10]
                }[dir];
            
            chart.labels.translate.apply(chart.labels, tr);
            chart.push(chart.labels);
        };

        if (opts.legend) {
            legend(opts.legend, opts.legendothers, opts.legendmark, opts.legendpos);
        }

        chart.push(series, covers, middle_point, mesh);
        chart.series = series;
        chart.covers = covers;

        return chart;
    };

    //inheritance
    var F = function() {};
    F.prototype = Raphael.g;
    Radarchart.prototype = new F;
    
    //public
    Raphael.fn.radarchart = function(cx, cy, r, values, opts) {
        return new Radarchart(this, cx, cy, r, values, opts);
    };

})();
