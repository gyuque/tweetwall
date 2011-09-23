(function() {
	"use strict";
	var $H = gyuque.utils.$H;
	var theApp;
	var TWAPI_CONSUMER_KEY = "RZLDi8T5nzxNd1qSLiqQ";
	var TWAPI_CONSUMER_SECRET = "iU5BGl8FflVmi9qW7Mc6LPmgm8e9EsCtxhqyY1bwhU";
	var TWAPI_BASE     = "https://api.twitter.com/oauth/";
	var TWAPI_HOME_URL = "https://api.twitter.com/1/statuses/home_timeline.json";
	var TWAPI_MENTIONS_URL = "https://api.twitter.com/1/statuses/mentions.json";
	var TWAPI_FAV_URL = "https://api.twitter.com/1/favorites/create/$ID.json";
	var TWAPI_UNFAV_URL = "https://api.twitter.com/1/favorites/destroy/$ID.json";
	var TWAPI_RT_URL = "https://api.twitter.com/1/statuses/retweet/$ID.json";
	var TWAPI_DESTROY_URL = "https://api.twitter.com/1/statuses/destroy/$ID.json";

	var RSTAT_MANUAL_RELOAD_READY = 0;
	var RSTAT_LOADING = 1;
	
	var LOAD_HOME    = 0;
	var LOAD_MENTIONS = 1;
	
	var _twtempls=[];
	
	window.TweetModelEvents = {
		fireFav:
		 function(d, item){d.trigger(TweetModelEvents.FavedLocally,item);},
		fireUnfav:
		 function(d, item){d.trigger(TweetModelEvents.UnfavedLocally,item);},
		 
		fireRemoteFav:
		 function(d, item, failed){d.trigger(failed ? TweetModelEvents.FailedToFav : TweetModelEvents.Faved,item);},
		fireRemoteUnfav:
		 function(d, item, failed){d.trigger(failed ? TweetModelEvents.FailedToUnfav :TweetModelEvents.Unfaved,item);},

		fireRT:
		 function(d, item){d.trigger(TweetModelEvents.RTLocally,item);},
		fireUndoRT:
		 function(d, item){d.trigger(TweetModelEvents.UndoRTLocally,item);},
		fireRemoteRT:
		 function(d, item, failed, response){d.trigger(failed ? TweetModelEvents.FailedToRT : TweetModelEvents.Retweeted,[item, response]);},
		fireRemoteUndoRT:
		 function(d, item, failed){d.trigger(failed ? TweetModelEvents.FailedToUndoRT : TweetModelEvents.UndoneRT,item);},
		fireRTIdSet:
		 function(d, item){d.trigger(TweetModelEvents.RTIdSet, item);},

		FavedLocally: 'faved_locally',
		Faved: 'faved',
		UnfavedLocally: 'unfaved_locally',
		Unfaved: 'unfaved',
		FailedToFav: 'failed_to_fav',
		FailedToUnfav: 'failed_to_unfav',
		
		Retweeted: 'retweeted',
		RTLocally: 'retweeted_locally',
		UndoRTLocally: 'undone_retweet_locally',
		FailedToRT: 'failed_to_rt',
		UndoneRT: 'undonert',
		FailedToUndoRT: 'failed_to_unrt',
		RTIdSet: 'rt_id_set'
	};

	function TweetWallApp(main_nav_id) {
		var _this = this;
		this.jWindow = $(window);
		this.PINboxId = "pin-form-container";
		this.slide = new SlideNavigationBox(document.getElementById(main_nav_id));
		this.detailView = null;
		this.twr = new tweet_model.TweetRegistry();
		this.timeToUseCache = 15;
		this.chTabs = null;
		this.currentChannelName = 'h';
	
		this.twloader = new TweetLoader(this.modelEventDispatcher());
		this.ur = new UserRegistry();
		this.callbackOnHomeLoaded = function(j,k) { _this.onHomeLoaded(j,k); };
		this.callbackOnLoadError = function(j,k) { _this.onLoadError(j,k); };
//setTimeout(function(){window.location.reload(true)}, 45000);

		this.alertLayer = new AlertLayer();
		this.alertLayer.makeLayer(document);
		
		document.body.addEventListener('keydown', function(e){_this.onGlobalKeydown(e);}, true);
		this.jWindow.resize(function() { _this.onGlobalResize(_this.jWindow); });
		this.firstLoaded = false;
		
		this.setupModelEvents();
	}
	
	TweetWallApp.prototype = {
		updateTimeDisp: function() {
			var nowt = (new Date()).getTime();
			this.lvTweets.updateTimeDisp(nowt);
		},
	
		modelEventDispatcher: function() {
			return this.jWindow;
		},
			
		setupModelEvents: function() {
			var _this = this;
			this.modelEventDispatcher().
			  bind(TweetModelEvents.FavedLocally, function(e,f){_this.onFavedLocally(e,f);}).
			  bind(TweetModelEvents.UnfavedLocally, function(e,f){_this.onUnfavedLocally(e,f);}).
			  bind(TweetModelEvents.Faved, function(e,f){_this.onFavedRemotely(e,f);}).
			  bind(TweetModelEvents.Unfaved, function(e,f){_this.onUnfavedRemotely(e,f);}).
			  bind(TweetModelEvents.RTLocally, function(e,f){_this.onRTLocally(e,f);}).
			  bind(TweetModelEvents.Retweeted, function(e,f,g){_this.onRetweeted(e,f,g);}).
			  bind(TweetModelEvents.UndoRTLocally, function(e,f){_this.onUndoRTLocally(e,f);}).
			  bind(TweetModelEvents.UndoneRT, function(e,f){_this.onUndoneRT(e,f);});
		},
		
		onFavedLocally: function(e, targetTweet) {
			this.twloader.fav(targetTweet);
		},

		onUnfavedLocally: function(e, targetTweet) {
			this.twloader.fav(targetTweet, true);
		},
		
		onRTLocally: function(e, targetTweet) {
			this.twloader.rt(targetTweet);
		},
		
		onUndoRTLocally: function(e, targetTweet) {
			if (targetTweet.retweeted_by_me) {
				this.twloader.delete_id(targetTweet.retweeted_by_me, targetTweet);
			}
		},
		
		onUndoneRT: function(e, rtTarget) {
			this.twr.setRetweetedId(rtTarget.id_str, null);
			TweetModelEvents.fireRTIdSet(this.modelEventDispatcher(), rtTarget);

			var item = this.lvTweets.getMappedItem(rtTarget.id_str);
			if (item) { item.updateRTRibbon(); }
		},
		
		onRetweeted: function(e, orgTweet, rtTweet) {
			this.twr.setRetweetedId(orgTweet.id_str, rtTweet.id_str);
			TweetModelEvents.fireRTIdSet(this.modelEventDispatcher(), orgTweet);

			var item = this.lvTweets.getMappedItem(orgTweet.id_str);
			if (item) { item.updateRTRibbon(); }
		},

		onFavedRemotely: function(e, targetTweet) {
			this.twr.setFaved(targetTweet.id_str, true);
			var item = this.lvTweets.getMappedItem(targetTweet.id_str);
			if (item) { item.updateFaved(); }
		},

		onUnfavedRemotely: function(e, targetTweet) {
			this.twr.setFaved(targetTweet.id_str, false);
			var item = this.lvTweets.getMappedItem(targetTweet.id_str);
			if (item) { item.updateFaved(); }
		},
			
		loadInitial: function() {
			if (!this.twloader.loadTokens()) {
				$('#main-slide-nav, #main-page-list').hide();
				this.requestToken();
			} else {
				this.hidePINForm();
				this.onLoaderReady();
			}
			
			this.onGlobalResize(this.jWindow);
		},
		
		onGlobalResize: function(w) {
			if (this.lvTweets) {
				this.lvTweets.setHeight(w.height() - 40);
			}
		},
		
		onGlobalKeydown: function(e) {
			if (this.alertLayer.isBusy() || !this.firstLoaded) {
				return;
			}
			
			var k = e.keyCode;
			var accept = false;
			var bc = this.slide.bottomController();
			var rcv = (bc == this.lvTweets) ? this : bc;
			
			switch(k) {
				case 82:
					if (e.shiftKey) {
						this.twloader.clearTokens();
						window.location.reload();
					}
					break;
				case 37:
					if (e.shiftKey) {
						this.moveTab(-1);
					}
					break;
				case 39:
					if (e.shiftKey) {
						this.moveTab(1);
					}
					break;
				case 38:
					rcv.moveFocus('U');
					accept = true;
					break;
				case 40:
					rcv.moveFocus('D');
					accept = true;
					break;
				case 13:
					rcv.pushTrigger('Y');
					accept = true;
					break;
			}
			
			if (accept) {
				e.stopPropagation();
				e.preventDefault();
			}
		},
		
		moveTab: function(dir) {
			if (!this.firstLoaded) return;
			this.slide.goUpImmediately();
			
			if (dir < 0)
				this.chTabs.selectPrev();
			else
				this.chTabs.selectNext();
		},
		
		moveFocus: function(dir) {
			if (this.slide.locked) {return;}
			var ci = this.lvTweets.getSelectedIndex();
			var ni = ci;
			var returnToTop = false;
			if (dir == 'D') {
				++ni;
				var nextItem = this.lvTweets.itemByIndex(ni);
				if (nextItem) {
					this.lvTweets.selectSingleItem( nextItem );
				} else {
					this.lvTweets.selectSingleItem( this.lvTweets.itemByIndex(0) );
					returnToTop = true;
				}
			} else if (dir == 'U') {
				if (ni > 0) {
					--ni;
					this.lvTweets.selectSingleItem( this.lvTweets.itemByIndex(ni) );
				}
			}
			
			if (this.lvTweets.primarySelectedItem) {
				var vh = this.lvTweets.viewHeight();
				var mgn = (vh/5) >> 0;
				var ih = this.lvTweets.primarySelectedItem.height();
				this.lvTweets.jOuterElement.stop().scrollTo(this.lvTweets.primarySelectedItem.element, {
					duration: 250,
					queue: false,
					offset: {left:0, top: (dir == 'U' || returnToTop) ? -mgn : (mgn+ih-vh)},
					direction: (dir == 'U' || returnToTop) ? -1 : 1
				});
			}
		},
		
		pushTrigger: function(trgName) {
			if (trgName == 'Y') {
				this.openSelectedRow();
			}
		},
		
		openSelectedRow: function() {
			var item = this.lvTweets.primarySelectedItem;
			if (item && item.tag == "reload-row") {
				if (!this.twloader.loadingHome) {
					this.updateTimeline();
				}
			} else if (item && item.tag.text) {
				this.openTweetItem(this.lvTweets, item);
			}
		},
		
		openTweetItem: function(lv, lvItem) {
			lvItem.hideWithBox();
			this.slide.drillDown('single');
		},
	
		requestToken: function() {
			var accessor = {
				consumerSecret: TWAPI_CONSUMER_SECRET,
				tokenSecret: ''
			};
			
			var message = {
			   method: "GET",
			   action: TWAPI_BASE + "request_token",
			   parameters: {
			     oauth_signature_method: "HMAC-SHA1",
			     oauth_consumer_key: TWAPI_CONSUMER_KEY
			   }
			};
			
			OAuth.setTimestampAndNonce(message);
			OAuth.SignatureMethod.sign(message, accessor);
			var target = OAuth.addToURL(message.action, message.parameters);
				
			var _this = this;
			var options = {
				type: message.method,
				url: target,
				success: function(d, dt) {
					var tok = extractResponseValue(d, 'oauth_token');
					var sec = extractResponseValue(d, 'oauth_token_secret');
					_this.oauth_token_secret = sec;
					_this.oauth_token = tok;
					if (sec && tok) {
						window.open(TWAPI_BASE+"authorize?"+d);
					}
				},
			};
			
			$.ajax(options);
		},
		
		hidePINForm: function() {
			$('#' + this.PINboxId).hide();
		},
		
		buildChannelTab: function(eid) {
			var el = document.getElementById(eid);
			this.chTabs = new ChannelTab(el);
			
			this.chTabs.add("Home", "h");
			this.chTabs.add("Mentions", "m");
			this.chTabs.add(" ", " ", true);
			this.chTabs.add(" ", " ", true);
			
			this.chTabs.selectFirst();
			
			var _this = this;
			this.chTabs.eventDispatcher().bind(ChannelTab.CHANGED, function(e,f){
				_this.onChTabChanged(f);
			});
		},
		
		onChTabChanged: function(newtab_name) {
			if (this.currentChannelName != newtab_name) {
				this.setChannel(newtab_name);
			}
		},
		
		setChannel: function(name) {
			if (this.currentChannelName != name) {
				this.currentChannelName = name;
				this.clearTweetItems();
				this.lvTweets.selectFirst();
				this.lvTweets.scrollToTop();
				this.updateTimeline();
			}
		},
		
		clearTweetItems: function() {
			var lv = this.lvTweets;
			for (;;) {
				var item = lv.lastItem();
				if (item && item.tag && item.tag.id_str) {
					lv.removeLastItem(item.tag.id_str);
				} else {
					break;
				}
			}
		},
	
		buildTweetList: function(containerElement, itemClassName) {
			this.lvTweets = new TweetListView(containerElement, itemClassName);
			this.lvTweets.owner = this;
			
			this.headingRow = this.lvTweets.makeHeadingItem();
			this.headingRow.tag = "reload-row";
			this.lvTweets.selectSingleItem( this.lvTweets.itemByIndex(0) );
			
			this.slide.add(this.lvTweets, containerElement, 'twlist');
		},
		
		buildTweetDetail: function(containerElement) {
			this.detailView = new TweetDetailView(containerElement, this.modelEventDispatcher());
			this.slide.add(this.detailView, containerElement, 'single');
			this.detailView.setUserRegistry(this.ur);
		},
		
		showHeadingRowStatus: function(stat) {
			if (stat == RSTAT_MANUAL_RELOAD_READY)
				this.headingRow.setHeadingText("Reload");
			else
				this.headingRow.setHeadingText("Loading...");
		},
		
		watchPINform: function(formid) {
			var _this = this;
			var tx = $('#'+formid + " input[type=\"text\"]")
			$('#'+formid).submit(function(){
				_this.fetchAccessToken(tx.val());
			});
		},
		
		fetchAccessToken: function(pin) {
			var _this = this;
			var accessor = {
				consumerSecret: TWAPI_CONSUMER_SECRET,
				tokenSecret: this.oauth_token_secret
			};
			
			var message = {
			   method: "GET",
			   action: TWAPI_BASE+ "access_token",
			   parameters: {
			     oauth_signature_method: "HMAC-SHA1",
			     oauth_consumer_key: TWAPI_CONSUMER_KEY,
			     oauth_token: this.oauth_token,
			     oauth_verifier: pin
			   }
			};
			
			OAuth.setTimestampAndNonce(message);
			OAuth.SignatureMethod.sign(message, accessor);  
			
			var target = OAuth.addToURL(message.action, message.parameters);
			var options = {
				type: message.method,
				url: target,
				success: function(d, dt) {
					var tok = extractResponseValue(d, 'oauth_token');
					var sec = extractResponseValue(d, 'oauth_token_secret');
					if (tok && sec) {
						_this.saveTokens(tok, sec);
						window.location.reload();
					}
				},
			};
			$.ajax(options);    
		},
		
		saveTokens: function(tok, sec) {
			this.twloader.saveTokens(tok, sec);
		},
		
		onLoaderReady: function() {
			this.firstLoaded = true;
			this.updateTimeline();
		},
		
		updateTimeline: function() {
			var target_api;
			var lasttime = 999;
			if (this.currentChannelName == 'h') {
				target_api = LOAD_HOME;
				lasttime = this.twr.relTimestampHome() / 1000;
			} else {
				target_api = LOAD_MENTIONS;
				lasttime = this.twr.relTimestampReplies() / 1000;
			}
			
			if (lasttime < this.timeToUseCache) {
				// Won't call api.
				this.showCachedTweets(target_api, this.callbackOnHomeLoaded);
				return;
			}
			

			this.twloader.loadTweets(target_api, this.callbackOnHomeLoaded, 30, true, this.callbackOnLoadError);
			this.showHeadingRowStatus(RSTAT_LOADING);
		},
		
		showCachedTweets: function(target_api, callback) {
			this.showHeadingRowStatus(RSTAT_LOADING);
			setTimeout(function(){callback(null, target_api)} , 100);
		},
		
		firstTweetRow: function() {
			var lv = this.lvTweets;
			var item = lv.itemByIndex(0);
			if (item.isHeading) {
				item = lv.itemByIndex(1);
			}
			
			return item;
		},
		
		onLoadError: function(api_type) {
			this.showHeadingRowStatus(RSTAT_MANUAL_RELOAD_READY);
			this.alertLayer.alert("Failed to load tweets.");
		},
		
		onHomeLoaded: function(tweets, api_type) {
			// change heading-row
			this.showHeadingRowStatus(RSTAT_MANUAL_RELOAD_READY);
			
			// save tweets
			if (tweets) {
				this.twr.fromAPIResult(tweets, api_type == LOAD_MENTIONS);
			}

			var oldTopItem = this.firstTweetRow();
			var lvLength = this.lvTweets.getMappedCount();
			
			// extract new incoming tweets
			_twtempls.length = 0;
			//if (lvLength < 10)
				this.twr.getTweets(_twtempls, this.currentChannelName == 'm');
			//else
			//	this.twr.getNewTweets(_twtempls, this.currentChannelName == 'm');

			this.fillTweetList(_twtempls);
			
			if (oldTopItem) {
				this.scrollNewTweets(oldTopItem);
			}
		},
		
		fillTweetList: function(tweets) {
			var nowt = (new Date()).getTime();
			var len = tweets.length;
			for (var i = 0;i < len;i++) {
				var t = tweets[i];

				var existing = this.lvTweets.getMappedItem(t.id_str);
				var li = null;
				if (!existing) {
					var lastIndex = this.lvTweets.findLastTweetIndex('absoluteTime', t.absoluteTime); 
					li = this.lvTweets.requestEmptyItem(lastIndex);
					li.tag = t;
					this.lvTweets.mapId(t.id_str, li);
					this.renderTweetOnItem(t, li, nowt);
					li.updateRTRibbon();
				} else {
					li = existing;
					li.updateFav();
				}
			}
		},

		scrollNewTweets: function(oldTopItem) {
			var sh = this.lvTweets.sumHeight(oldTopItem);
			this.lvTweets.jOuterElement.scrollTop(sh);
			this.lvTweets.jOuterElement.scrollTo(this.headingRow.element, {duration: 390});
		},
		
		renderTweetOnItem: function(t, li, originTime) {
			var ur = this.ur;
			ur.register(t.user);
			if (t.retweeted_status) {
				ur.register(t.retweeted_status.user);
			}
 
			TweetListView.Item.renderTweetOnItem(li, t, ur, originTime);
		}
	};
	
	function UserRegistry() {
		this.idMap = {};
	}
	
	UserRegistry.FileNameRe = /_normal(\.[a-zA-Z]+)$/
	UserRegistry.prototype = {
		register: function(u) {
			this.idMap[u.id_str] = u;
			u.midIconURL = this.makeMidIconURL(u);
		},
		
		byId: function(id) {
			return this.idMap[id.toString()];
		},
		
		makeMidIconURL: function(u) {
			var base = u.profile_image_url;
			var s = base;
			if (base.match(UserRegistry.FileNameRe))
				s = base.replace(UserRegistry.FileNameRe, '_reasonably_small' + RegExp['$1']);
			return s;
		}
	};
	
	
	function TweetListView(outerElement, itemClassName) {
		this.itemClassName = itemClassName;
		this.idmap = {};
		this.owner = null;
		
		this.outerElement = outerElement;
		this.jOuterElement = $(this.outerElement);
		
		this.containerElement = $H('ul', 'tweetlist-inner');
		this.j = $(this.containerElement);
		this.outerElement.appendChild(this.containerElement);
		
		this.list = [];
		this.primarySelectedItem = null;
	}
	
	TweetListView.prototype = {
		scrollToTop: function() {
			this.setScrollPosition(0);
		},
	
		onGoUpFrom: function() {
			if (this.owner)
				this.owner.updateTimeDisp();
		},

		viewHeight: function() {
			return this.jOuterElement.height();
		},
		
		scrollLength: function() {
			return this.jOuterElement.scrollTop();
		},
		
		setScrollPosition: function(y) {
			this.jOuterElement.scrollTop(y);
		},
		
		setHeight: function(h) {
			this.jOuterElement.height(h);
		},
		
		sumHeight: function(upto) {
			var ls = this.list;
			var len = ls.length;
			var sum = 0;
			for (var i = 0;i < len;i++) {
				var item = ls[i];
				if (item == upto){break;}
				
				if (!item.isHeading) {
					sum += item.outerHeight();
				}
			}
			
			return sum;
		},
		
		makeHeadingItem: function() {
			var item = new TweetListView.Item(this.itemClassName, true);
			this.list.push(item);
			this.containerElement.appendChild(item.element);
			
			return item;
		},
		
		updateTimeDisp: function(originTime) {
			var ls = this.list;
			var len = ls.length;
			for (var i = 0;i < len;i++) {
				var item = ls[i];
				if (item.tag && item.tag.absoluteTime) {
					var relsec = Math.round((originTime - item.tag.absoluteTime) / 1000);
					item.setFooter( makeRelTime(relsec) );
				}
			}
		},
		
		findLastTweetIndex: function(tagProp, val) {
			var ls = this.list;
			var len = ls.length;
			for (var i = 0;i < len;i++) {
				var item = ls[i];
				if (item.tag && item.tag[tagProp]) {
					if (val > item.tag[tagProp]) {
						return i;
					}
				}
			}
			
			return -1;
		},
	
		selectFirst: function() {
			this.selectSingleItem( this.itemByIndex(0) );
		},
	
		getSelectedIndex: function() {
			if (!this.primarySelectedItem)
				return -1;
				
			var ls = this.list;
			var len = ls.length;
			for (var i = 0;i < len;i++) {
				if (ls[i] == this.primarySelectedItem) {
					return i;
				}
			}
			
			return -1;
		},
	
		selectSingleItem: function(item) {
			if (this.primarySelectedItem) {
				this.primarySelectedItem.showSelection(false);
			}
			
			if (item) {
				item.showSelection(true);
			}
			
			this.primarySelectedItem = item;
		},
		
		itemByIndex: function(i) {
			return this.list[i] || null;
		},

		requestEmptyItem: function(beforeIndex) {
			var item = new TweetListView.Item(this.itemClassName);
			var bi = -1;
			if (beforeIndex > 0 || beforeIndex === 0) {
				bi = beforeIndex;
			}
			
			if (bi < 0) {
				this.list.push(item);
				this.containerElement.appendChild(item.element);
			} else {
				this.containerElement.insertBefore(item.element, this.list[bi].element);
				this.list.splice(bi, 0, item);
			}
			
			return item;
		},
		
		mapId: function(idstr, item) {
			this.idmap[idstr] = item;
		},
		
		getMappedItem: function(idstr) {
			return this.idmap[idstr];
		},
		
		getMappedCount: function() {
			var c = 0;
			for (var id in this.idmap) {
				++c;
			}
			
			return c;
		},
		
		lastItem: function() {
			if (this.list.length < 1)
				return null;
				
			return this.list[ this.list.length - 1 ] || null;
		},
		
		removeLastItem: function(removeId) {
			var item = this.list.pop();
			this.containerElement.removeChild(item.element);
			if (removeId) {
				delete this.idmap[removeId];
			}
		}
	};

	TweetListView.Item = function(className, heading) {
		this.element = $H('li', className);
		this.j = $(this.element);
		this.tag = null;
		this.bottomBorderWidth = 1;
		this.topBorderWidth = 1;
		
		if (heading) {
			this.createHeadingItem();
		} else {
			TweetListView.Item.buildTweetBox(this);
		}
	};
 
	TweetListView.Item.renderTweetOnItem = function(li, t, ur, originTime) {
		var timestamp = t.absoluteTime;			
		var relsec = Math.round((originTime - timestamp) / 1000);

		var rfav = false;
		var user = ur.byId(t.user.id_str);
		var r_user = null;
		if (t.retweeted_status) {
			r_user = ur.byId(t.retweeted_status.user.id_str);
		}
 
		li.setCaptionImageURL(r_user ? r_user.midIconURL : user.midIconURL);
		 
		if (t.retweeted_status) {
			li.setHeadingText(r_user.screen_name, user.screen_name);
			li.setTweetText(t.retweeted_status);
			rfav = t.retweeted_status.favorited;
		} else {
			li.setHeadingText(user.screen_name);
			li.setTweetText(t);
		}
		 
		li.setFaved(t.favorited || rfav);
		li.setFooter( makeRelTime(relsec) );
	};
	
	TweetListView.Item.buildTweetBox = function(that) {
		 that.captionAreaElement = $H('div', 'caption');
		 that.captionAreaIconElement = $H('img', 'caption-icon');
		
		 that.headingElement = $H('h3', 'tweet-heading');
		 that.jHeadingElement = $( that.headingElement);

		 that.favElement = $H('span', 'fav-badge');

		 that.contentElement = $H('div', 'tweet-text');
		 that.jContentElement = $( that.contentElement);

		 that.footerElement = $H('div', 'tweet-footer');
		 that.footerTime = $H('a', 'tweet-timestamp');
		 that.jFooterTime = $( that.footerTime);
		
		 that.element.appendChild( that.captionAreaElement);
		 that.captionAreaElement.appendChild( that.captionAreaIconElement);
		 that.element.appendChild( that.headingElement);
		 that.element.appendChild( that.favElement);
		 that.element.appendChild( that.contentElement);

		 that.footerElement.appendChild( that.footerTime);
		 that.element.appendChild( that.footerElement);
		 
		 
		that.glowIcon = $H('img', 'tweet-fav-glow');
		that.glowIcon.src = "images/fav-g.png";
		that.favElement.appendChild( that.glowIcon );
		that.glowIcon.style.opacity = 0;
		
		this.rtRibbon = null;
	};
	
	TweetListView.Item.prototype = {
		updateFav: function() {
			var t = this.tag;
			var rfav = false;
			if (t) {
				if (t.retweeted_status) {
					rfav = t.retweeted_status.favorited;
				}
				
				this.setFaved(t.favorited || rfav);
			}
		},
	
		flashSelection: function() {
			gyuque.utils.setTransitionProperty(s, 'opacity').
			             setTransitionDuration(s, '0.4s').
			             setTransitionEaseOut(s).
						 setTransitionEvent(element, function(){ _this.onTransitionEnd(); });
		},
		
		flashFav: function() {
			var s = this.glowIcon.style;
			gyuque.utils.setTransitionProperty(s, 'opacity').
			             setTransitionDuration(s, '0s').
			             setTransitionLinear(s);
			s.opacity = 1;
			             
			setTimeout(function(){
				gyuque.utils.setTransitionProperty(s, 'opacity').
				             setTransitionDuration(s, '0.4s').
				             setTransitionLinear(s);
				s.opacity = 0;
			}, 20);
		},
		
		updateFaved: function() {
			if (this.tag) {
				this.setFaved(this.tag.favorited);
			}
		},
		
		updateRTRibbon: function() {
			if (this.tag) {
				if (!this.rtRibbon) {
					this.rtRibbon = document.createElement('img');
					this.rtRibbon.className = "rt-ribbon-image";
					this.rtRibbon.src = "images/rt-ribbon-r.png";
					this.element.appendChild(this.rtRibbon);
				}
			
				if (this.tag.retweeted_by_me) {
					this.j.addClass("retweeted-by-me");
				} else {
					this.j.removeClass("retweeted-by-me");
				}
			}
		},
	
		createHeadingItem: function() {
			this.headingContentElement = $H('h3', 'heading-content');
			this.jHeadingContentElement = $(this.headingContentElement);
			this.element.appendChild(this.headingContentElement);
			this.j.addClass("heading-item");
			this.isHeading = true;
		},
		
		hide: function() {
			this.j.hide();
		},

		hideWithBox: function() {
			this.j.css('visibility', 'hidden');
		},

		show: function() {
			this.j.show().
			       css('visibility', '');
		},
	
		setCaptionImageURL: function(u) {
			this.captionAreaIconElement.src = u || '';
		},
		
		height: function() {
			return this.j.height();
		},

		outerHeight: function() {
			return this.j.outerHeight();
		},
		
		setHeadingText: function(s, rtby) {
			if (this.jHeadingContentElement) {
				this.jHeadingContentElement.text(s);
				return;
			}
			
			this.jHeadingElement.text(s);
			if (rtby) {
				this.addRTIcon(this.headingElement);
				this.addRTBy(this.headingElement, rtby);
			}
		},

		setFaved: function(f) {
			if (f)
				this.j.addClass("faved");
			else
				this.j.removeClass("faved");
		},

		setTweetText: function(t) {
			var s = t.text;
			if (s.indexOf('<') >= 0) {
				throw "danger tweet text!";
			}
			
			this.contentElement.innerHTML = gyuque.utils.linkify_entities(t);
		},
		
		addRTIcon: function(el) {
			var ico = $H('img', 'rt-indicator');
			ico.src = "images/rti.png";
			el.insertBefore(ico, el.firstChild);
		},

		addRTBy: function(el, name) {
			var s = $H('span', 'rt-by');
			s.appendChild( document.createTextNode(' RT by ' + name) );
			el.appendChild(s);
		},
		
		setFooter: function(relTime) {
			this.jFooterTime.text(relTime);
		},
		
		showSelection: function(b) {
			if (b)
				this.j.addClass("selected");
			else
				this.j.removeClass("selected");
		}
		
	};
	
	
	
	// --- Loader
	function TweetLoader(modelEventDispatcher) {
		this.modelEventDispatcher = modelEventDispatcher;
		this.accessToken = null;
		this.accessSecret = null;
		
		this.loadingHome = false;
	}
	
	TweetLoader.createEmptyAccessor = function(sec) {
		return {
			consumerSecret: TWAPI_CONSUMER_SECRET,
			tokenSecret: sec || ''
		};
	};
	
	TweetLoader.prototype = {
		loadTokens: function() {
			var t = localStorage['TwitterAccessToken'];
			var s = localStorage['TwitterAccessSecret'];
			if (t && s && t.length > 2 && s.length > 2) {
				this.accessToken  = t;
				this.accessSecret = s;
				return true;
			}
			
			return false;
		},
		
		clearTokens: function() {
			this.saveTokens('', '');
		},
		
		saveTokens: function(tok, sec) {
			this.accessToken  = tok;
			this.accessSecret = sec;
			localStorage['TwitterAccessToken']  = tok;
			localStorage['TwitterAccessSecret'] = sec;
		},
		
		finishOAuthRequest: function(message, accessor) {
			OAuth.setTimestampAndNonce(message);
			OAuth.SignatureMethod.sign(message, accessor);
			return OAuth.addToURL(message.action, message.parameters);
		},
		
		delete_id: function(tid, rt_target) {
			var accessor = TweetLoader.createEmptyAccessor(this.accessSecret);
			var message = {
				method: "POST",
				action: TWAPI_DESTROY_URL.replace('$ID', tid),
				parameters: {
					oauth_signature_method: "HMAC-SHA1",
					oauth_consumer_key: TWAPI_CONSUMER_KEY,
					oauth_token: this.accessToken
				}
			};
			
			var target = this.finishOAuthRequest(message, accessor);
			var _this = this;
			
			var options = {
				type: message.method,
				url: target,
				dataType: 'json',
				success: function(d, dt) {
					if (rt_target) {
						TweetModelEvents.fireRemoteUndoRT(_this.modelEventDispatcher, rt_target, false);
					}
				},
				error: function() {
					if (rt_target) {
						TweetModelEvents.fireRemoteUndoRT(_this.modelEventDispatcher, rt_target, true);
					}
				}
			};
			
			this.destroying = $.ajax(options); // 送信
		},
		
		rt: function(targetTweet, undo) {
			var accessor = TweetLoader.createEmptyAccessor(this.accessSecret);
			var message = {
				method: "POST",
				action: TWAPI_RT_URL.replace('$ID', targetTweet.id_str),
				parameters: {
					oauth_signature_method: "HMAC-SHA1",
					oauth_consumer_key: TWAPI_CONSUMER_KEY,
					oauth_token: this.accessToken
				}
			};
			
			var target = this.finishOAuthRequest(message, accessor);
			var _this = this;
			
			var options = {
				type: message.method,
				url: target,
				dataType: 'json',
				success: function(d, dt) {
					if (undo)
						TweetModelEvents.fireRemoteUndoRT(_this.modelEventDispatcher, targetTweet);
					else
						TweetModelEvents.fireRemoteRT(_this.modelEventDispatcher, targetTweet, false, d);
				},
				error: function() {
					TweetModelEvents.fireRemoteRT(_this.modelEventDispatcher, targetTweet, true);
				}
			};
			
			this.sendingRT = $.ajax(options); // 送信
		},

		fav: function(targetTweet, unfav) {
			var accessor = TweetLoader.createEmptyAccessor(this.accessSecret);
			var message = {
				method: "POST",
				action: (unfav ? TWAPI_UNFAV_URL : TWAPI_FAV_URL).replace('$ID', targetTweet.id_str),
				parameters: {
					oauth_signature_method: "HMAC-SHA1",
					oauth_consumer_key: TWAPI_CONSUMER_KEY,
					oauth_token: this.accessToken
				}
			};
			
			var target = this.finishOAuthRequest(message, accessor);
			var _this = this;

			var options = {
				type: message.method,
				url: target,
				dataType: 'json',
				success: function(d, dt) {
					if (unfav)
						TweetModelEvents.fireRemoteUnfav(_this.modelEventDispatcher, targetTweet);
					else
						TweetModelEvents.fireRemoteFav(_this.modelEventDispatcher, targetTweet);
				},
				
				error: function() {
					if (unfav)
						TweetModelEvents.fireRemoteUnfav(_this.modelEventDispatcher, targetTweet, true);
					else
						TweetModelEvents.fireRemoteFav(_this.modelEventDispatcher, targetTweet, true);
				}
			};
			this.sendingFav = $.ajax(options); // 送信
		},

		loadTweets: function(targetType, callback, count, reload_debug, error_callback) {
window.TEST_API_RESULT=null;
			if (window.TEST_API_RESULT) {
				var test_d = window.TEST_API_RESULT.slice(0);
				if (reload_debug) {
					test_d.shift(); test_d.shift();
					test_d.shift(); test_d.shift();
					test_d.shift(); test_d.shift();
				}
				
				setTimeout(function(){ callback(test_d);}, 200);
				return;
			}
		
			var accessor = TweetLoader.createEmptyAccessor(this.accessSecret);
			var _this = this;

			var api_url = (targetType==LOAD_HOME) ? TWAPI_HOME_URL : TWAPI_MENTIONS_URL;
			var message = {
				method: "GET",
				action: api_url,
				parameters: {
					oauth_signature_method: "HMAC-SHA1",
					oauth_consumer_key: TWAPI_CONSUMER_KEY,
					oauth_token: this.accessToken,
					include_entities: 'true',
					count: count || 30
				}
			};

			var target = this.finishOAuthRequest(message, accessor);
			var options = {
				type: message.method,
				url: target,
				dataType: 'json',
				success: function(d, dt) {
					_this.loadingHome = false;
					
					callback(d, targetType);
				},
				
				error: function() {
					_this.loadingHome = false;
					if (error_callback) {
						error_callback(targetType);
					}
				}
			};
			this.loadingHome = $.ajax(options); // 送信
		}
	};

	function extractResponseValue(res, name)
	{
		var re = new RegExp(name+'=([-a-zA-Z0-9]+)');
		if (res.match(re)) {
			return RegExp['$1'];
		}
		
		return null;
	}
	
	function makeRelTime(s) {
		s = s >> 0;
		if (s < 60) {
			return s + ((s==1) ? " second" : " seconds");
		} else if (s < 3600) {
			s = Math.round(s/60);
			return s + ((s==1) ? " minute" : " minutes");
		} else if (s < (3600*48)) {
			s = Math.round(s/3600);
			return s + ((s==1) ? " hour" : " hours");
		} else {
			s = Math.round(s/(3600*24));
			return s + ((s==1) ? " day" : " days");
		}
	}

	if (!window.gyuque) { window.gyuque = {}; }
	window.gyuque.TweetListView = TweetListView;
 
	window.launch_tw = function(options) {
		theApp = new TweetWallApp("main-slide-nav");
		theApp.watchPINform(options.PINFormId);
		theApp.buildChannelTab(options.MainChannelTabId);
		theApp.buildTweetList(document.getElementById(
				options.TweetListContainerId
			), options.TweetListItemClassName);
			
		theApp.buildTweetDetail( document.getElementById('tweet-detail-container') );
		
		theApp.loadInitial();
	};
})();