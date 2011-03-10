var MeetingTimer = new Class({
    Implements: [Options, Events],
    timer: null,
    billablePattern: /(\D*)([\d.]+)/,

    options: {
        'num-people': 'num-people',
        'avg-billable': 'avg-billable',
        'spent': 'spent',
        'ctrls': 'ctrls',
        'hours': 'hours',
        'reset': 'reset',
        'resume': 'resume',
        'minutes': 'minutes',
        'amt-spent': 'amt-spent',
        'value': 'value',
        'currency': 'currency',
        'start': 'start',
        'elapsed': 'elapsed'
    },

    initialize: function(el, opts){
        this.initFromUrl();
        this.initEvents();
    },

    initFromUrl: function(){
        var qs = window.location.search.substr(1);
        var parts = qs.split('&');
        var pair, key, val;

        while(parts.length > 0){
           pair = parts.shift().split('='); 
           key = pair.shift(); 
           val = pair.shift();
           if(key == 'billable') this.setValue(this.options['avg-billable'], val)
           if(key == 'people') this.setValue(this.options['num-people'], val)
        }
    },

    initEvents: function(){
        this.startBtn();
        this.pauseBtn();
        this.resumeBtn();
        this.resetBtn();
    },

    startBtn: function(){
        var startBtn = document.id(this.options['start']);
        var amtSpent = document.id(this.options['amt-spent']);
        var height = startBtn.getCoordinates().height;
        var self = this;

        var hideStart = this.getStdTransition(startBtn, 'bottom', function(){
            self.start();
        });
        var showSpent = this.getStdTransition(amtSpent, 'bottom');

        startBtn.addEvent('click', function(){
            hideStart.start(0, -height); 
            showSpent.start(-height, 0);
        });
    },

    pauseBtn: function(){
        var amtSpent = document.id(this.options['amt-spent']);
        amtSpent.addEvent('click', function(){
            this.setSpentOpacity(1, .1);
            this.showItem(document.id(this.options['ctrls']));
            //this.showCtrls();
            this.togglePause();
        }.bind(this));
    },

    resumeBtn: function(){
        var resume = document.id(this.options['resume']);
        resume.addEvent('click', function(){
            this.setSpentOpacity(.1, 1);
            this.hideItem(document.id(this.options['ctrls']));
            this.togglePause();
        }.bind(this));
    },
    
    resetBtn: function(){
        var resume = document.id(this.options['reset']);
        resume.addEvent('click', function(){
            clearInterval(this.timer);
            this.prevSpent = 0;
            this.prevElapsed = 0;
            this.setSpentAmtView(0.0);
            this.setSpentOpacity(.1, 1);
            this.hideItem(document.id(this.options['ctrls']));
            this.hideItem(document.id(this.options['amt-spent']));
            this.showStart();
        }.bind(this));
    },

    showStart: function(){
        var start = document.id(this.options['start']);
        var dims = start.getCoordinates();
        var slide = this.getStdTransition(start, 'bottom');
        slide.start(-dims.height, 0);
    },

    showCtrls: function(){
        this.setSpentOpacity(1, .1);
        var ctrls = document.id(this.options['ctrls']);
        var dims = ctrls.getCoordinates();
        ctrls.setStyles({
            'display': 'block',
        });
        var slide = this.getStdTransition(ctrls, 'bottom');
        slide.start(-dims.height, 0);
    },

    hideItem: function(elem){
        var slide = this.getStdTransition(elem, 'bottom');
        var dims = elem.getCoordinates();
        slide.start(0, -dims.height);
    },

    showItem: function(elem){
        var slide = this.getStdTransition(elem, 'bottom');
        var dims = elem.getCoordinates();
        slide.start(-dims.height, 0);
    },

    togglePause: function(){
        this.running = !this.running;
        this.lastTime = new Date();
    },

    getStdTransition: function(elem, prop, complete){
        var tween = new Fx.Tween(elem, {
            property: prop,
            duration: 'short',
            transition: Fx.Transitions.Quint.easeInOut
        });
        if(complete) tween.addEvent('complete', complete);
        return tween;
    },
    setSpentOpacity: function(start, end){
        var amtSpent = document.id(this.options['amt-spent']);
        var fade = this.getStdTransition(amtSpent, 'opacity');
        fade.start(start, end);
    },

    parseBillableValue: function(billable){
        var val,
            results = billable.match(this.billablePattern);

        try{
            val = parseInt(results.pop(), 10)
        } catch(err){
            console.log('bad format');
        }

        return val;
    },

    parseCurrency: function(billable){
        var currency,
            results = billable.match(this.billablePattern);

        try{
            currency = results[1] || '$';
        } catch(err){
            console.log('bad format');
        }

        return currency;
    },

    calc: function(elapsed){
        var numPeople = parseInt(document.id(this.options['num-people']).get('value'), 10);
        var billable = document.id(this.options['avg-billable']).get('value');
        var billableAmt = this.parseBillableValue(billable);
        var costPerHour = numPeople * billableAmt;
        var hours = (elapsed / 1000) / 3600;
        var spent = hours * costPerHour;
        return spent;
    },

    setCurrency: function(){
        var billable = document.id(this.options['avg-billable']).get('value');
        var currency = this.parseCurrency(billable);
        document.id(this.options['currency']).set('html', currency);
    },

    update: function(){
        if(!this.running) return;

        var now = new Date();
        var elapsed = now - this.lastTime;
        var spent = this.calc(elapsed);
        this.incrementElapsed(elapsed);
        this.incrementSpent(spent);
        this.setCurrency();
        this.lastTime = now;
    },

    incrementElapsed: function(elapsed){
        var previouslyElapsed = this.getPreviouslyElapsed();
        this.prevElapsed = previouslyElapsed + elapsed;
        var elapsedObj = this.splitElapsed(this.prevElapsed);
        document.id(this.options['hours']).set('text', elapsedObj.hours);
        document.id(this.options['minutes']).set('text', elapsedObj.min);
    },

    incrementSpent: function(spent){
        var previouslySpent = this.getPreviouslySpent();
        this.prevSpent = previouslySpent + spent;
        var amtView = this.prevSpent.toFixed(2);
        this.setSpentAmtView(amtView);
        var spentAmt = document.id(this.options['value']).set('text', amtView);
    },

    setSpentAmtView: function(amt){
        var spentAmt = document.id(this.options['value']).set('text', amt);
    },

    getPreviouslySpent: function(){
        return this.prevSpent || 0;
    },

    getPreviouslyElapsed: function(){
        return this.prevElapsed || 0;
    },

    start: function(){
        this.running = true;
        this.lastTime = new Date();
        this.timer = setInterval(this.update.bind(this), 1000);
    },

    pause: function(){
        this.running = false;
    },

    splitElapsed: function(elapsed){
        var seconds = elapsed / 1000;
        var hours = Math.floor(seconds / 3600);
        var min = Math.floor((seconds - (hours * 3600)) / 60);
        return {hours: hours, min: min};
    },

    displayElapsed: function(elapsed){
        elapsedObj = this.splitElapsed(elapsed);
        document.id(this.options['hours']).set('text', elapsedObj.hours);
        document.id(this.options['minutes']).set('text', elapsedObj.min);
    },

    displaySpent: function(spent){
        var amtView = spent.toFixed(2);
        var spentAmt = document.id(this.options['value']).set('text', amtView);
    },

    setValue: function(id, value){
        document.id(id).set('value', value);
    }
});

window.addEvent('domready', function(){
    init();        
});

function init(){
    var mt = new MeetingTimer();
}
