(function() {

    var habitats = d3.map({
        "B": {
            key: "B",
            ordinal: 0,
            name: "Brackish",
            color: d3.rgb(0, 69, 177)
        },
        "M": {
            key: "M",
            ordinal: 1,
            name: "Marine",
            color: d3.rgb(29, 239, 134)
        },
        "L": {
            key: "L",
            ordinal: 2,
            name: "Littoral",
            color: d3.rgb(246, 241, 0)
        },
        "F": {
            key: "F",
            ordinal: 3,
            name: "Freshwater",
            color: d3.rgb(219, 0, 0)
        },
        "T": {
            key: "T",
            ordinal: 4,
            name: "Terrestrial",
            color: d3.rgb(255, 121, 0)
        },
        "V": {
            key: "V",
            ordinal: 5,
            name: "Volant",
            color: d3.rgb(175, 56, 240)
        }
    });

/**
    var colorScale = colorbrewer.RdYlBu[habitats.values().length].reverse();

    habitats.values().forEach(function(h) {
        h.color = d3.rgb(colorScale[h.ordinal]);
    });
**/

    // todo - read this from the file or something
    var periods = [
        "hadean precambrian",
        "isuan",
        "swazian",
        "randian",
        "huronian",
        "animakean",
        "riphean",
        "sturtian",
        "vendian",
        "caerfai cambrian palaeozoic",
        "st david's",
        "merioneth",
        "tremadoc ordovician",
        "arenig",
        "llanvirn",
        "llandeilo",
        "caradoc",
        "ashgill",
        "llandovery silurian",
        "wenlock",
        "ludlow",
        "pridoli",
        "lochkovian devonian",
        "pragian",
        "emsian",
        "eifelian",
        "givetian",
        "frasnian",
        "famennian",
        "tournaisian carboniferous",
        "visean",
        "serpukhovian",
        "bashkirian",
        "moscovian",
        "kasimovian",
        "gzelian",
        "asselian permian",
        "sakmarian",
        "artinskian",
        "kungurian",
        "ufimian",
        "kazanian",
        "tatarian",
        "scythian triassic mesozoic",
        "anisian",
        "ladinian",
        "carnian",
        "norian",
        "rhaetian",
        "hettangian jurassic",
        "sinemurian",
        "pliensbachian",
        "toarcian",
        "aalenian",
        "bajocian",
        "bathonian",
        "callovian",
        "oxfordian",
        "kimmeridgian",
        "portlandian",
        "berriasian cretaceous",
        "valanginian",
        "hauterivian",
        "barremian",
        "aptian",
        "albian",
        "cenomanian",
        "turonian",
        "coniacian",
        "santonian",
        "campanian",
        "maastrichtian",
        "danian palaeogene cainozoic",
        "thanetian",
        "ypresian",
        "lutetian",
        "bartonian",
        "priabonian",
        "rupelian",
        "chattian",
        "lower miocene neogene",
        "middle miocene",
        "upper miocene",
        "pliocene",
        "pleistocene quaternary",
        "holocene"
    ];

    var periodDetails = {};

    function speciesTimeline(species) {
        var timeline = [];
        periods
            // remove time periods for which this species has not been found
            .filter(function(p) {
                return species && p && species.get(p) != "";
            })
            // return time grid data
            .forEach(function(p, i) {
                timeline.push(d3.map({
                    time: periods.indexOf(p),
                    parent: species
                }));
            });
        species.set("timeline", timeline);
        return timeline;
    }


    function collect(input) {
        periods.forEach(function(p, i) {
            periodDetails[i] = {name: p, time: i, total: 0, habitats: {}};
            habitats.values().forEach(function(h) {
                periodDetails[i].habitats[h.key] = 0;
            });
        });
        // reset habitat info
        habitats.values()
            .forEach(function(h) {
                h.count = 0;
                h.t0 = habitats.values().length;
            });
        var speciesList = input
            .map(function(row) {
                return makeSpeciesInfo(d3.map(row));
            });
        return d3.shuffle(speciesList.filter(function(s) { return s.found(); }));
    }

    function makeSpeciesInfo(species) {
        var timeline = speciesTimeline(species);
        var h = species.get("habitat");
        if(!habitats.has(h[0])) {
            h = "M";
        }
        // update habitat counts
        var habitat = habitats.get(h[0]);
        habitat.count++;
        // update time period stats
        timeline.forEach(function(t) {
            var time = t.get("time");
            periodDetails[time].total++;
            periodDetails[time].habitats[habitat.key]++;
        });
        species.set("habitat", habitat);
        species.set("occurrances", timeline.length);
        species.set("timeline", timeline);

        species.found = 
            function() {
                return timeline.length > 0;
            };
        species.firstTime =
            function() {
                if(this.found()) {
                    return timeline[0].get("time");
                }
            };
        species.lastTime =
            function() {
                if(this.found()) {
                    return timeline[timeline.length-1].get("time");
                }
            };
        species.duration =
            function() {
                if(this.found()) {
                    return species.lastTime() - species.firstTime();
                }
            };
        if(species.found()) {
            habitat.t0 = Math.min(habitat.t0, timeline[0].get("time"));
        }
        return species;
    }


    var fr = {
        parse: function(path, callback) {
            d3.csv(path, function(raw) {
                callback(collect(raw));
            });
        },
        applySort:
            function(list, comparator) {
                list.sort(comparator.fn); 
                return {
                    orderedSpeciesList: list,
                    timeline: this.makeGrid(list)
                };
            },
        periods:
            function() {
                return periods;
            },
        periodDetails:
            function() {
                return periodDetails;
            },
        makeGrid:
            function(speciesList) {
                var timegrid = [];
                speciesList.forEach(function(species, i) {
                    var habitat = species.get("habitat");
                    species.get("timeline").forEach(function(cell, j) {
                        cell.set("speciesIndex", i);
                        timegrid.push(cell);
                    });
                });
                return timegrid;
            },
        makeTree:
            function(name, speciesList) {
                var nest = d3.nest()
                    .key(function(d) { return d.get("kingdom"); })
                    .key(function(d) { return d.get("phylum"); })
                    .key(function(d) { return d.get("classname"); })
                    .key(function(d) { return d.get("family"); })
                    .rollup(function(leaves) { return leaves.length; })
                    .entries(speciesList);

                console.log(nest);

                var makeNode = function(parent, list) {
                    var node = {
                        name: parent ? parent.key : name,
                        children: []
                    };
                    if(list && list.length > 0) {
                        list.forEach(function(child, i) {
                            node.children.push(makeNode(child, child.values));
                        });
                    }
                    return node;
                };

                return makeNode(null, nest);
            },
        cross: function(speciesList, args) {
            var agg = d3.map({}),
                max = 0;
            speciesList.forEach(function(s) {
                var xval = args.xfun(s),
                    yval = args.yfun(s),
                    key  = xval + ":" + yval,
                    cell = {
                        x: xval,
                        y: yval,
                        count: 0
                    };
                if(xval && yval) {
                    if(agg.has(key)) {
                        cell = agg.get(key);
                    }
                    else {
                        agg.set(key, cell);
                    }
                    cell.count++;
                    max = d3.max([cell.count, max]);
                }
            });
            return {
                data: agg.values(),
                xdomain: d3.set(
                    agg.values()
                    .map(function(d) {
                        return d.x;
                    })).values()
                    .sort(args.xsort),
                ydomain: d3.set(
                    agg.values()
                    .map(function(d) { 
                        return d.y;
                    })).values()
                    .sort(args.ysort),
                max: max
            };
        },
        timelineRollup: function(speciesList, args) {
            var agg = d3.map({});
            var maxByKey = {};
            speciesList.forEach(function(s) {
                var yval = args.yfun(s);
                if(yval) {
                    var timeline = s.get("timeline").map(function(t, i) {
                        return t.get("time");
                    });
                    var cell = {};
                    if(agg.has(yval)) {
                        cell = agg.get(yval);
                        timeline.forEach(function(t) {
                            cell.max = d3.max([cell.max, ++cell.timeline[t]]);
                            maxByKey[cell.key] = cell.max;
                        });
                    }
                    else {
                        cell.timeline =
                            periods.map(function(p, i) {
                                if(timeline.indexOf(i) == -1) {
                                    return 0;
                                }
                                else {
                                    cell.max = 1;
                                    return 1;
                                }
                            });
                        cell.key = yval;
                        maxByKey[cell.key] = 1;
                        agg.set(yval, cell);
                    }
                }
            });
            return {
                max: d3.max(agg.values(), function(d) { return d.max; }),
                maxByKey: maxByKey,
                data: agg.values().sort(function(a, b) { return b.max - a.max; })
            }
        },
        comparators: [
            {
                name: "By Habitat",
                fn:
                    function(a, b) {
                        var ha = a.get("habitat");
                        var hb = b.get("habitat");
                        var cmp = ha.t0 - hb.t0;
                        if(cmp == 0) {
                            cmp = ha.ordinal - hb.ordinal;
                            if(cmp == 0) {
                                cmp = a.firstTime() - b.firstTime();
                                if(cmp == 0) {
                                    cmp = b.duration() - a.duration();
                                }
                            }
                        }
                        return cmp;
                    }
            },
            {
                name: "By Start",
                fn:
                    function(a, b) {
                        var cmp = a.firstTime() - b.firstTime();
                        if(cmp == 0) {
                            var ha = a.get("habitat").count;
                            var hb = b.get("habitat").count;
                            cmp = ha - hb;
                            if(cmp == 0) {
                                cmp = b.duration() - a.duration();
                            }
                        }
                        return cmp;
                    }
            }
        ],
        habitats: habitats
    };

    window.fr = fr;
})();
