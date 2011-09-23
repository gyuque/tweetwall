(function() {
	"use strict";
	var $H = gyuque.utils.$H;

	var ActionMenu = function() {
		this.element = $H('ul', 'actionmenu-list');
		this.j = $(this.element);
		
		this.items = [];
		this.selectedItem = null;
	};
	
	ActionMenu.prototype = {
		clear: function() {
			for (var i in this.items) {
				var item = this.items[i];
				this.element.removeChild(item.element);
			}
			
			this.items.length = 0;
			this.selectedItem = null;
		},
		
		selectPrev: function() {
			if (this.selectedItem) {
				this.selectIndex( this.selectedItem.index - 1);
			}
		},

		selectNext: function() {
			if (this.selectedItem) {
				this.selectIndex( this.selectedItem.index + 1);
			}
		},
		
		selectFirst: function() {
			if (this.items.length > 0) {
				this.selectItem(this.items[0]);
			}
		},
		
		selectIndex: function(i) {
			var item = this.items[i];
			if (item) {
				this.selectItem(item);
			}
		},
		
		selectItem: function(item) {
			if (this.selectedItem) {
				this.selectedItem.showSelection(false)
			}
			
			this.selectedItem = item;
			this.selectedItem.showSelection(true)
		},
		
		addItem: function(label, name, iconIndex) {
			var item = new ActionMenu.Item(label, iconIndex, name);
			this.element.appendChild(item.element);
			item.index = this.items.length;
			this.items.push(item);
			
			return item;
		},
		
		startAnimation: function() {
			this.doAnimation(true);
		},

		finishAnimation: function() {
			this.doAnimation(false);
		},
		
		doAnimation: function(dir) {
			var _this = this;
			var ls = this.items, i, s;
			for (i in ls) {
				s = ls[i].element.style;
				s.visibility = "";
				s.opacity = dir ? 0 : 1;
				if (dir) {
					s.top = "110px";
				}
			}
		
			setTimeout(function() {
				for (i in ls) {
					s = ls[i].element.style;
					gyuque.utils.setTransitionProperty(s, 'top,opacity,background-color,box-shadow').
			             setTransitionDuration(s, dir ? '0.25s' : '0.3s', dir ? ((i * 0.05)+'s') : '0s' ).
			             setTransitionEaseOut(s);
			             
			        s.top = 0;
					s.opacity = dir ? 1 : 0;
				}
			}, dir ? 120 : 20);	
		}
	};
	
	ActionMenu.Item = function(label, iconIndex, name) {
		this.name = name;
		this.iconIndex = iconIndex || 0;
		this.icon = $H('img', 'actionmenu-list-icon');
		this.icon.src = "images/dmy.gif";
		this.icon.width = 24;
		this.icon.height = 32;
		this.updateBackgroundPosition(false);

		this.element = $H('li', 'actionmenu-list-item');
		this.j = $(this.element);
		
		this.label = $H('span');
		this.label.appendChild( document.createTextNode(label) );
		
		this.element.appendChild( this.icon );
		this.element.appendChild( this.label );
		this.element.style.visibility = 'hidden';
		this.index = 0;
		
		this.spinning = false;
		this.selected = false;
	};
	
	ActionMenu.Item.prototype = {
		showSelection: function(b) {
			this.selected = b;
			if (b) {
				gyuque.utils.removeTransitions(this.element.style);
				this.updateBackgroundPosition();
				this.j.addClass("selected");
			}
			else {
				this.updateBackgroundPosition();
				this.j.removeClass("selected");
			}
		},
		
		showSending: function() {
			this.j.addClass('sending');
			this.label.innerHTML = "Sending...";
			this.spinning = true;
			this.updateBackgroundPosition();
		},
		
		stopSending: function() {
			this.j.removeClass('sending');
			this.spinning = false;
		},
		
		setLabel: function(t) {
			$(this.label).text(t);
		},
		
		setIconIndex: function(i) {
			this.iconIndex = i;
			this.updateBackgroundPosition();
		},
		
		updateBackgroundPosition: function() {
			if (this.spinning)
				this.icon.style.backgroundPosition =  "";
			else
				this.icon.style.backgroundPosition =  (this.selected ? "-24px " : "0 ") + (-this.iconIndex*32) +"px";
		},
		
		flash: function() {
			var j = this.j;
			var s = this.element.style;
			j.addClass('active');
			gyuque.utils.setTransitionProperty(s, 'background-color,box-shadow').
			             setTransitionDuration(s, '0s', '0s').
			             setTransitionLinear(s);
			setTimeout(function(){
				gyuque.utils.setTransitionProperty(s, 'background-color,box-shadow').
				             setTransitionDuration(s, '0.2s', '0s').
				             setTransitionLinear(s);
				j.removeClass('active');
			}, 20);
		}
	};
	
	window.ActionMenu = ActionMenu;
})();