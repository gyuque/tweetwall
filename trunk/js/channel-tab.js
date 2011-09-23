(function() {
	"use strict";
	var $H = gyuque.utils.$H;
	
	function ChannelTab(containerElement) {
		this.containerElement = containerElement;
		this.j = $(containerElement);
		this.items = [];
		this.selected = null;
	}
	
	ChannelTab.CHANGED = "chtab_changed";
	ChannelTab.prototype = {
		eventDispatcher: function() {
			return this.j;
		},
	
		add: function(label, name, dmy) {
			var item = new ChannelTab.Item(label, name);
			if (!dmy) {
				this.items.push(item);
			}
			
			this.containerElement.appendChild(item.element);
			return item;
		},
		
		selectFirst: function() {
			this.selectItem(this.itemAt(0));
		},
		
		itemAt: function(i) {
			return this.items[i] || null;
		},
		
		selectItem: function(item) {
			if (this.selected) {
				this.selected.showSelection(false)
			}

			var old = this.selected;
			this.selected = item;
			if (this.selected) {
				this.selected.showSelection(true);
			}
			
			if (old != item) {
				this.eventDispatcher().trigger(ChannelTab.CHANGED, item.name);
			}
		},
		
		selectNext: function() {
			if (this.selected) {
				var i = this.indexOf(this.selected);
				i = (i+1) % this.items.length;
				this.selectItem( this.itemAt(i) );
			}
		},

		selectPrev: function() {
			if (this.selected) {
				var i = this.indexOf(this.selected);
				i = (i-1 + this.items.length) % this.items.length;
				this.selectItem( this.itemAt(i) );
			}
		},
		
		indexOf: function(item) {
			if (item) {
				for (var i in this.items) {
					if (this.items[i] == item) {
						return i - 0;
					}
				}
			}
			return -1;
		}
	};
	
	
	ChannelTab.Item = function(label, name) {
		this.element = $H('li', 'channel-tab-item');
		this.j = $(this.element).text(label);
		this.name = name;
	};
	
	ChannelTab.Item.prototype = {
		showSelection: function(b) {
			if (b)
				this.j.addClass('selected');
			else
				this.j.removeClass('selected');
		}
	};
	
	
	window.ChannelTab = ChannelTab;
})();