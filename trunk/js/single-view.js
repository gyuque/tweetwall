(function() {
	"use strict";
	var $H = gyuque.utils.$H;

	function TweetDetailView(outerElement, me) {
		this.modelEventDispatcher = me;
		this.itemPositionTop = 13;
		this.outerElement = outerElement;
		this.jOuterElement = $(this.outerElement).hide();
 
		this.primaryItem = new TweetDetailView.Item();
		this.outerElement.appendChild(this.primaryItem.element);
		this.ur = null;
		this.userRegistry = null;
		this.slide = null;
		
		this.target = null;
		this.itemOldPosition = 0;
		this.itemScrollPosition = 0;
		
		this.menu = new ActionMenu();
		this.favMenuItem = null;
		this.outerElement.appendChild( this.menu.element );
		
		var _this = this;
		this.modelEventDispatcher.
		 bind(TweetModelEvents.Faved, function(e, t){
			_this.onFaved(t);
		 }).
		 bind(TweetModelEvents.Unfaved, function(e, t){
			_this.onUnfaved(t);
		 }).
		 bind(TweetModelEvents.FailedToFav, function(e, t){
			_this.onFavFailed(t);
		 }).
		 bind(TweetModelEvents.FailedToUnfav, function(e, t){
			_this.onFavFailed(t);
		 }).
		 bind(TweetModelEvents.RTIdSet, function(e, t){
			_this.onRTIdSet(t);
		 }).
		 bind(TweetModelEvents.FailedToRT, function(e, t){
			_this.onRTFailed(t);
		 }).
		 bind(TweetModelEvents.FailedToUndoRT, function(e, t){
			_this.onUndoRTFailed(t);
		 });
;
	}
	
	TweetDetailView.prototype = {
		setUserRegistry: function(ur) {
			this.userRegistry = ur;
		},
 
		onDrillDownFrom: function(upper, slideNav) {
			this.jOuterElement.show();
			this.slide = slideNav;
			
			var listItem = upper.primarySelectedItem;
			if (listItem && !listItem.isHeading) {
				var nowt = (new Date()).getTime();
				this.primaryItem.tag = listItem.tag;
				gyuque.TweetListView.Item.renderTweetOnItem(
													 this.primaryItem,
													 listItem.tag,
													 this.userRegistry,
													 nowt
												);
				
				this.primaryItem.updateRTRibbon();
				
				var oy = listItem.element.offsetTop - upper.scrollLength() + listItem.topBorderWidth;
				this.itemScrollPosition = upper.scrollLength();
				this.itemOldPosition = oy;
				this.flyAnimation(oy);

				this.target = listItem.tag;
				this.buildMenu(listItem.tag);
				this.menu.startAnimation();
			}
		},
		
		buildMenu: function(tweet) {
			this.menu.clear();
			this.menu.addItem("Back", "back", 2);
			this.favMenuItem = this.menu.addItem("Favorite", "fav", 1);
			this.rtMenuItem  = this.menu.addItem("Retweet", "rt", 0);

			if (tweet.retweeted_by_me) {
				this.toggleToUndoRT();
			}

			if (tweet.favorited) {
				this.toggleToUnfav();
			}
			
			this.menu.selectFirst();
		},
		
		onGoUpTo: function(upper, immediately) {
			var _this = this;
			var element = this.primaryItem.element;
			var s = element.style;
			var closure_fin = function(e){
						 	upper.primarySelectedItem.show();
						 	if (e) {
						 		_this.onTransitionEnd(e);
						 	}
						 	_this.jOuterElement.hide();
						 };
						 
			var closure = function() {
				gyuque.utils.setTransitionProperty(s, 'top').
			             setTransitionDuration(s, '0.35s').
			             setTransitionEaseOut(s).
						 setTransitionEvent(element, closure_fin, true);
				s.top = _this.itemOldPosition+'px';
				};
			
			if (immediately)
				closure_fin();
			else
				setTimeout(closure, 20);	
			
			upper.setScrollPosition(this.itemScrollPosition);
			if (!immediately)
				this.menu.finishAnimation();
		},

		flyAnimation: function(oy) {
			var element = this.primaryItem.element;
			var s = element.style;
			var y = this.itemPositionTop;
			
			s.top = oy+'px';
//			gyuque.utils.translate(s, 0, oy - y);

			var _this = this;
			setTimeout(function() {
			gyuque.utils.setTransitionProperty(s, 'top').
			             setTransitionDuration(s, '0.3s').
			             setTransitionEaseOut(s).
						 setTransitionEvent(element, function(e){ _this.onTransitionEnd(e); }, true);
			s.top = y+'px';
//			gyuque.utils.translate(s, 0, 0);
			}, 20);
		},

		onTransitionEnd: function(e) {
			e.stopPropagation();
			gyuque.utils.removeTransitions(this.primaryItem.element.style);
		},

		// operation
		moveFocus: function(dir) {
			if (dir == 'D') {
				this.menu.selectNext();
			} else if (dir == 'U') {
				this.menu.selectPrev();
			}
		},
		
		pushTrigger: function(trgName) {
			if (trgName == 'Y') {
				var mi = this.menu.selectedItem;
				if (mi) {
					mi.flash();
					var func = "onMenu_" + mi.name;
					if (this[func]) {
						this[func]();
					}
				}
			}
		},
		
		// === Menu Handlers ===
		
		onMenu_back: function() {
			this.slide.goUp();
		},

		onMenu_fav: function() {
			if (this.favMenuItem.spinning)
				return;
				
			this.favMenuItem.showSending();
			TweetModelEvents.fireFav(this.modelEventDispatcher, this.target);
		},

		onMenu_unfav: function() {
			if (this.favMenuItem.spinning)
				return;
				
			this.favMenuItem.showSending();
			TweetModelEvents.fireUnfav(this.modelEventDispatcher, this.target);
		},

		onMenu_rt: function() {
			var mi = this.rtMenuItem;
			if (mi.spinning)
				return;
				
			mi.showSending();
			TweetModelEvents.fireRT(this.modelEventDispatcher, this.target);
		},

		onMenu_unrt: function() {
			var mi = this.rtMenuItem;
			if (mi.spinning)
				return;
				
			mi.showSending();
			TweetModelEvents.fireUndoRT(this.modelEventDispatcher, this.target);
		},
		
		// == After Remote Operation ==
		
		onFaved: function(targetTweet) {
			if (this.target.id_str == targetTweet.id_str) {
				this.primaryItem.setFaved(true);
				this.primaryItem.flashFav();
				this.toggleToUnfav();
			}
		},

		onUnfaved: function(targetTweet) {
			if (this.target.id_str == targetTweet.id_str) {
				this.primaryItem.setFaved(false);
				this.primaryItem.flashFav();
				this.toggleToFav();
			}
		},
		
		onFavFailed: function(targetTweet) {
			if (this.target.id_str == targetTweet.id_str) {
				this.favMenuItem.setLabel("Failed");
			}
		},
		
		onUndoRTFailed: function(rtTarget) {
			if (this.target.id_str == rtTarget.id_str) {
				this.rtMenuItem.setLabel("Failed");
			}
		},
		
		onRTIdSet: function(originalTweet) {
			if (this.target.id_str == originalTweet.id_str) {
				this.primaryItem.updateRTRibbon();
				if (originalTweet.retweeted_by_me)
					this.toggleToUndoRT();
				else
					this.toggleToRT();
					
				this.primaryItem.updateRTRibbon();
			}
		},

		onRTFailed: function(targetTweet) {
			if (this.target.id_str == targetTweet.id_str) {
				this.rtMenuItem.setLabel("Failed");
			}
		},
		
		toggleToUnfav: function() {
			this.favMenuItem.stopSending();
			this.favMenuItem.setLabel("Unfavorite");
			this.favMenuItem.setIconIndex(5);
			this.favMenuItem.name = 'unfav';
		},

		toggleToFav: function() {
			this.favMenuItem.stopSending();
			this.favMenuItem.setLabel("Favorite");
			this.favMenuItem.setIconIndex(1);
			this.favMenuItem.name = 'fav';
		},

		toggleToUndoRT: function() {
			this.rtMenuItem.stopSending();
			this.rtMenuItem.setLabel("Undo RT");
			this.rtMenuItem.setIconIndex(0);
			this.rtMenuItem.name = 'unrt';
		},

		toggleToRT: function() {
			this.rtMenuItem.stopSending();
			this.rtMenuItem.setLabel("Retweet");
			this.rtMenuItem.setIconIndex(0);
			this.rtMenuItem.name = 'rt';
		}
	};
	
	TweetDetailView.Item = function() {
		this.element = $H('div', 'single-tweet-item-container');
		this.j = $(this.element);
		gyuque.TweetListView.Item.buildTweetBox(this);
	};
	
	var basekls = gyuque.TweetListView.Item.prototype;
	TweetDetailView.Item.prototype = {
		setCaptionImageURL: basekls.setCaptionImageURL,
		setHeadingText: basekls.setHeadingText,
		setTweetText: basekls.setTweetText,
		setFaved: basekls.setFaved,
		setFooter: basekls.setFooter,
		addRTBy: basekls.addRTBy,
		addRTIcon: basekls.addRTIcon,
		flashFav: basekls.flashFav,
		updateRTRibbon: basekls.updateRTRibbon
	};
	
	window.TweetDetailView = TweetDetailView;
})();