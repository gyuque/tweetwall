(function() {
	"use strict";
	var $H = gyuque.utils.$H;
	
	window.SlideNavigationBox = function(existingElement) {
		this.element = existingElement;
		this.j = $(this.element);
		
		this.nameMap = {};
		this.element.style.position = "relative";
		
		this.displayList = [];
		this.poppedElement = null;
		
		this.locked = false;
	};
	
	SlideNavigationBox.prototype = {
		lock: function() {
			this.locked = true;
		},

		unlock: function() {
			this.locked = false;
		},
	
	
		drillDown: function(nextName) {
			if (this.locked){return;}
			this.lock();
	
			var oldObj = this.bottom();
			var newController = this.nameMap[nextName].controller;
			this.poppedElement = oldObj.element;
			//gyuque.utils.translate(oldObj.element.style, -this.j.width(), 0);
			oldObj.element.style.opacity = 0;
			this.displayList.push( this.nameMap[nextName] );
			newController.onDrillDownFrom(oldObj.controller, this);
		},
		
		goUpImmediately: function() {
			if (this.displayList.length < 2) {
				return;
			}

			var upperObj = this.displayList[this.displayList.length - 2];
			var s = upperObj.element.style;
			gyuque.utils.removeTransitions(s);
			s.display = "";
			s.opacity = 1;

			this.bottomController().onGoUpTo(upperObj.controller, true);
			if (upperObj.controller.onGoUpFrom)
				upperObj.controller.onGoUpFrom(this.bottomController());

			this.displayList.pop();
		},
		
		goUp: function() {
			if (this.locked){return;}
			this.lock();
			
			if (this.displayList.length < 2) {
				return;
			}
			var upperObj = this.displayList[this.displayList.length - 2];
			upperObj.element.style.display = "";
			setTimeout(function(){
				upperObj.element.style.opacity = 1;
			}, 20);
			
			this.bottomController().onGoUpTo(upperObj.controller);
			if (upperObj.controller.onGoUpFrom)
				upperObj.controller.onGoUpFrom(this.bottomController());
			
			this.displayList.pop();
			return upperObj.controller;
		},
		
		bottomController: function() {
			var b = this.bottom();
			return b ? b.controller : null;
		},
		
		bottom: function() {
			return this.displayList[ this.displayList.length-1 ];
		},
		
		onTransitionEnd: function() {
			if (this.poppedElement) {
				this.poppedElement.style.display = "none";
				this.poppedElement = null;
			}
			
			this.unlock();
		},
		
		add: function(controller, element, name) {
			var dat = {controller: controller, element: element};
		
			if (this.displayList.length < 1)
				this.displayList.push(dat);

			var _this = this;
			this.nameMap[name] = dat;
			var s = element.style;
			s.position = "absolute";
			s.top = 0;
			s.left = 0;
			
			gyuque.utils.setTransitionProperty(s, 'opacity').
			             setTransitionDuration(s, '0.4s').
			             setTransitionEaseOut(s).
						 setTransitionEvent(element, function(){ _this.onTransitionEnd(); });
		}
	};
})();