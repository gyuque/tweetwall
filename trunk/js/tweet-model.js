(function() {
	"use strict";
	var TweetRegistry = function() {
		this.idmap = {};
		this.home_idmap = {};
		this.replies_idmap = {};
		this.count = 0;
		this.prevFingerPrint = {home: "0", replies: "0"};
		
		this.newIds = {
			home: {},
			replies: {}
		};
		
		this.lastUpdate = {
			home: 0,
			replies: 0
		};
	};
	
	TweetRegistry.prototype = {
		setRetweetedId: function(orgTweet_id, rtTweet_id) {
			var o = this.byId(orgTweet_id);
			o.retweeted_by_me = rtTweet_id;
		},
	
		relTimestampHome: function() {
			return (new Date()) - this.lastUpdate.home;
		},

		relTimestampReplies: function() {
			return (new Date()) - this.lastUpdate.replies;
		},
		
		makeAPIFingerPrint: function(tweets) {
			var a = [];
			for (var i in tweets) {
				a.push(tweets[i].id_str);
			}
			
			return a.join('|');
		},
	
		fromAPIResult: function(tweets, is_replies) {
			var timestamp = (new Date()) - 0;
			if (!is_replies)
				this.lastUpdate.home = timestamp;
			else
				this.lastUpdate.replies = timestamp;


			var fpName = is_replies ? 'replies' : 'home';
			var newmap = is_replies ? this.newIds.replies : this.newIds.home;
			var fp = this.makeAPIFingerPrint(tweets);
			if (fp == this.prevFingerPrint[fpName]) {
				return;
			}
			
			this.prevFingerPrint[fpName] = fp;
		
			this.clearMap(newmap);
			var len = tweets.length;
			var i;
			
			for (i = 0;i < len;i++) {
				var t = tweets[i];
				this.count += this.updateMap(this.idmap, t, is_replies ? null : newmap);

				if (is_replies) {
					this.updateMap(this.replies_idmap, t, newmap);
				} else {
					this.updateMap(this.home_idmap, t, null);
				}
			}
			
		},

		fillIdMap: function(lsOut, src) {
			for (var tid in src) {
				lsOut.push(src[tid]);
			}

			lsOut.sort(cmp_t);
			return lsOut;
		},

		getTweets: function(lsOut, is_replies) {
			return this.fillIdMap(lsOut,  is_replies ? this.replies_idmap : this.home_idmap );
		},
		
		getNewTweets: function(lsOut, is_replies) {
			return this.fillIdMap(lsOut,  is_replies ? this.newIds.replies : this.newIds.home);
		},
		
		updateMap: function(map, t, newmap) {
			var tid = t.id_str;
			var count = 0;
			if (!map[tid]) {
				t.absoluteTime = parseTweetTime(t.created_at);
				map[tid] = t;
				count++;
				
				if (newmap) {
					newmap[tid] = t;
				}
			} else {
				map[tid].favorited = t.favorited;
			}
			
			return count;
		},
		
		setFaved: function(tid, b) {
			var t = this.byId(tid);
			if (t) {
				t.favorited = b;
			}
		},
		
		byId: function(tid) {
			return this.idmap[tid] || null;
		},
		
		clearMap: function(m) {
			for (var id in m) {
				delete m[id];
			}
		}
	};
	
	//                  WD            MON        DY         HMS       Z           Y
	var TWTIME_RE = /([a-zA-Z]+) +([a-zA-Z]+) +([0-9]+) +([:0-9]+) +([+0-9]+) +([0-9]+)/
	function parseTweetTime(raw) {
		if (raw.match(TWTIME_RE)) {
			var d = new Date(RegExp['$2']+' '+RegExp['$3']+', '+RegExp['$6']+' '+RegExp['$4']);
			var s = d.getTime();
			s -= d.getTimezoneOffset() * 60000;
			
			return s;
		}
		
		null;
	}

	function cmp_t(a,b){ return b.absoluteTime-a.absoluteTime; }

	window.tweet_model = {
		TweetRegistry: TweetRegistry
	};
})();