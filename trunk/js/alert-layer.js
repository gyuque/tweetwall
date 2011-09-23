(function() {
	"use strict";
	var $H = gyuque.utils.$H;
	function AlertLayer() {
		this.toshow = false;
		this.showing = false;
		var w = $(window);
		var _this = this;
		this.onResize = function() {
			if (_this.j) {
				_this.j.height( w.height() );
				_this.messageArea.style.marginTop = (((w.height() / 2) >> 0) - 60) +"px";
			}
		};
		
		w.resize(this.onResize);
	}
	
	AlertLayer.prototype = {
		isBusy: function() { return this.toshow || this.showing; },
	
		makeLayer: function(doc) {
			var el = doc.createElement("div");
			el.className = "alert-layer";
			doc.body.appendChild(el);
			this.element = el;
			this.j = $(el);
			
			this.messageArea = doc.createElement("span");
			this.jMessageArea = $(this.messageArea);
			el.appendChild(this.messageArea);
			this.onResize();
			
			var _this = this;
			gyuque.utils.setTransitionEvent(el, function(){
				_this.onTransitionEnd();
			});
		},
		
		alert: function(message) {
			this.jMessageArea.text(message);
		
			var s = this.element.style;
			var _this = this;
			s.display = "block";
			s.opacity = 0;
			this.toshow = true;

			setTimeout(function(){
				gyuque.utils.
				 setTransitionProperty(s, "opacity").
				 setTransitionLinear(s).
				 setTransitionDuration(s, "0.24s");
				s.opacity = 0.7;
			}, 20);

			setTimeout(function(){
				_this.toshow = false;
				_this.showing = true;
				gyuque.utils.
				 setTransitionProperty(s, "opacity").
				 setTransitionLinear(s).
				 setTransitionDuration(s, "0.3s");
				s.opacity = 0;
			}, 640);
		},
		
		onTransitionEnd: function() {
			if (this.showing) {
				this.element.style.display = "";
				this.showing = false;
			}
		}
	};
	
	window.AlertLayer = AlertLayer;
})();