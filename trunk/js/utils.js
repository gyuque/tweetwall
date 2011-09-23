if(!window.gyuque) window.gyuque={};

(function(pkg) {
	"use strict";

	pkg.utils = {
		$H: function(t, cls) {
			var elm = document.createElementNS("http://www.w3.org/1999/xhtml", t);
			if (cls){elm.className = cls;}
			return elm;
		},
		
		placeElement: function(el, x, y) {
			if (el) {
				el.style.left = Math.round(x)+"px";
				el.style.top  = Math.round(y)+"px";
			}
		},
		
		extendObject: function(o_sub, methods) {
			for (var method_name in methods)
			{  o_sub.prototype[method_name] = methods[method_name]; }
		},
		
		setTransitionProperty: function(s, props) {
			setTransitionStyle(s, 'transitionProperty', props);
			return pkg.utils;
		},

		setTransitionDuration: function(s, d, delay) {
			setTransitionStyle(s, 'transitionDuration', d);
			if (delay) {
				setTransitionStyle(s, 'transitionDelay', delay);
			}
			return pkg.utils;
		},
		
		setTransitionLinear: function(s) {
			setTransitionStyle(s, 'transitionTimingFunction', 'linear');
			return pkg.utils;
		},

		setTransitionEaseOut: function(s) {
			setTransitionStyle(s, 'transitionTimingFunction', 'ease-out');
			return pkg.utils;
		},

		setTransitionEvent: function(elem, f, once) {
			function f2(e) {
				elem.removeEventListener('webkitTransitionEnd', f2, false);
				elem.removeEventListener('transitionend', f2, false);	
				f(e);
			}
			
			elem.addEventListener('webkitTransitionEnd', once ? f2 : f, false);
			elem.addEventListener('transitionend', once ? f2 : f, false);
				
			return pkg.utils;
		},
		
		removeTransitions: function(s) {
			setTransitionStyle(s, 'transition', 'none');
			return pkg.utils;
		},
		
		translate: function(s,x,y) {
			var t = 'translate(' +Math.round(x)+ 'px,' +Math.round(y)+ 'px)';
			if (!x && !y)
				t = '';
				
			s.webkitTransform = t;
			// s.MozTransform = t;
			
			return pkg.utils;
		},
		
		scale: function(style, sc, tx, ty) {
			var val = 'scale('+sc+')';
			if (tx || ty) {
				val = 'translate(' +Math.round(tx)+ 'px,' +Math.round(ty)+ 'px) '+val;
			}
		
			style.webkitTransform = val;
			style.MozTransform = val;
		},
		
		loadJSONP: function(url) {
			var s = document.createElement('script');
			s.type = 'text/javascript';
			document.body.appendChild(s);
			
			s.src = url;
		},
		
		log: function(s) {
			if (window.console) {
				console.log(s);
			}
		},
		
		distanceLL: function(x1, y1, x2, y2)
		{
			var DEG2RAD = Math.PI / 180.0;
			x1 *= DEG2RAD;
			y1 *= DEG2RAD;
			x2 *= DEG2RAD;
			y2 *= DEG2RAD;
			var dx = Math.abs(x2-x1);
			var dy = Math.abs(y2-y1);
			var phi = dy*0.5 + y1;

			var S = Math.sin(phi);
			var M = 6335439.0 / (Math.sqrt( Math.pow( (1- 0.006674*S*S) , 3) ));
			var N = 6378137.0 / Math.sqrt( 1- 0.006674*S*S );

			return Math.sqrt( Math.pow(M*dy, 2) + Math.pow(N*Math.cos(phi)*dx ,2) );
		},
		
		intpPolygon: function(polygon, t, aout, lencache) {	
			var lens  = lencache;
			var count = lens.length;
			var all_len = lens.total;
			var pos = t * all_len;
			
			var prev_len = 0;
			var next_len = 0;
			var ii;
			for (var i = 0;i < count;i++) {
				prev_len = next_len;
				next_len += lens[i];
				ii = (i+1) % count;

				if (pos <= next_len) {
					var t1 = (pos - prev_len) / lens[i];
					var _t1 = 1.0 - t1;
					
					aout[0] = polygon[(i<<1)] * _t1 + polygon[(ii<<1)] * t1;
					aout[1] = polygon[(i<<1)+1] * _t1 + polygon[(ii<<1)+1] * t1;
					
					break;
				}
			}
		},

		makeLengthCache: function(polygon) {
			var total = 0;
			var ret = [];
			var len = polygon.length >> 1;
			for (var i = 0;i < len;i++) {
				var i2 = (i+1) % len;
				
				var d = gyuque.distanceLL(
					polygon[(i<<1)+1], polygon[i<<1],
					polygon[(i2<<1)+1], polygon[i2<<1]
				);
				
				total += d;
				ret.push(d);
			}
			
			ret.total = total;
			return ret;
		}
	};
	
	function setTransitionStyle(s, prop, val) {
		s[prop] = val;
		
		var cam = String.fromCharCode(prop.charCodeAt(0) - 32) + prop.substring(1);
		var wk  = 'webkit' + cam;
		var moz = 'Moz' + cam;
		s[wk] = val;
		s[moz] = val;
	}
	
	pkg.utils.LightLatLng = function() {};

	pkg.utils.LightLatLng.prototype = {
		lat: function() { return this._lat;},
		lng: function() { return this._lng;},
		to_key: function() {
			return this._lat +"_"+ this._lng;
		}
	};




// * * * Twitter entities

/*
 * twitter-entities.js
 * This function converts a tweet with "entity" metadata 
 * from plain text to linkified HTML.
 *
 * See the documentation here: http://dev.twitter.com/pages/tweet_entities
 * Basically, add ?include_entities=true to your timeline call
 *
 * Copyright 2010, Wade Simmons
 * Licensed under the MIT license
 * http://wades.im/mons
 *
 * Requires jQuery
 */

function escapeHTML(text) {
    return $('<div/>').text(text).html()
}

function linkify_entities(tweet) {
    if (!(tweet.entities)) {
        return escapeHTML(tweet.text)
    }
    
    // This is very naive, should find a better way to parse this
    var index_map = {}
    
    $.each(tweet.entities.urls, function(i,entry) {
        index_map[entry.indices[0]] = [entry.indices[1], function(text) {return "<a target=\"_blank\" href='"+escapeHTML(entry.url)+"'>"+escapeHTML(entry.display_url || text)+"</a>"}]
    })
    
    $.each(tweet.entities.hashtags, function(i,entry) {
        index_map[entry.indices[0]] = [entry.indices[1], function(text) {return "<a class=\"tweet-hashtag\" target=\"_blank\" href='http://twitter.com/search?q="+escape("#"+entry.text)+"'>"+escapeHTML(text)+"</a>"}]
    })
    
    $.each(tweet.entities.user_mentions, function(i,entry) {
        index_map[entry.indices[0]] = [entry.indices[1], function(text) {return "<a target=\"_blank\" title='"+escapeHTML(entry.name)+"' href='http://twitter.com/"+escapeHTML(entry.screen_name)+"'>"+escapeHTML(text)+"</a>"}]
    })
    
    var result = ""
    var last_i = 0
    var i = 0
    
    // iterate through the string looking for matches in the index_map
    for (i=0; i < tweet.text.length; ++i) {
        var ind = index_map[i]
        if (ind) {
            var end = ind[0]
            var func = ind[1]
            if (i > last_i) {
                result += escapeHTML(tweet.text.substring(last_i, i))
            }
            result += func(tweet.text.substring(i, end))
            i = end - 1
            last_i = end
        }
    }
    
    if (i > last_i) {
        result += escapeHTML(tweet.text.substring(last_i, i))
    }
    
    return result
}

	pkg.utils.linkify_entities = linkify_entities;

} )(gyuque);