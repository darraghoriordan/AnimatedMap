﻿class StatModel {
    constructor(jsonObject: any) {
        this.StartStat = jsonObject.StartStat;
        this.OccuredOn = moment(jsonObject.OccuredOn);
    }

    public StartStat: number;
    public OccuredOn: moment.Moment;
}

class StatCounter {
    totalDealerGmsStats: Array<StatModel>;
    totalDealerElement: JQuery;
    totalDealerGms: number;
    currentTime: moment.Moment;
    nextUpdateDue: moment.Moment;
    numberFormat: Intl.NumberFormat;
    localPlaybackOffset: number;
    frameLengthMilliseconds: number;
    updateRate: number;

    constructor() {
        this.nextUpdateDue = moment('2015-10-15');
        this.totalDealerGms = 0;
        this.totalDealerElement = $('#totalDealerGmsStat .statsValueText');
        this.totalDealerGmsStats = new Array<StatModel>();
        this.localPlaybackOffset = 1;
        this.numberFormat = new Intl.NumberFormat('en-NZ', {
            style: 'currency',
            currency: 'NZD',
            minimumFractionDigits: 0
        });
        this.updateRate = 0;
        this.frameLengthMilliseconds = 50;
    }

    startEventsService() {
        setInterval(() => { this.updateEvents(); }, this.frameLengthMilliseconds);
    }

    getNewEvents(startDate: moment.Moment, endDate: moment.Moment) {
        var currentInstance = this;
        let sdString = startDate.toISOString();
        let edString = endDate.toISOString();
        var startOfDay = moment().startOf("day").toISOString();
        let maxAmount: number = 0;
        let numberOfFrames: number=0;
        $.get(
            "/api/events/newdealergms", { startDate: sdString, endDate: edString },
            function (cdata) {

                if (cdata)
                    currentInstance.totalDealerGmsStats = $.map(cdata, (x) => {
                        return new StatModel(x);
                    });
                //calculate the rate of increase per frame/loop
                currentInstance.updateRate = 0;
                if (currentInstance.totalDealerGmsStats.length > 0) {
                    maxAmount = currentInstance.totalDealerGmsStats.reduce(function (sum, stat) { return sum + stat.StartStat; },0);
                                     
                    numberOfFrames = currentInstance.localPlaybackOffset * 60 * (1000 / currentInstance.frameLengthMilliseconds);
                    currentInstance.updateRate = Math.floor(maxAmount / numberOfFrames);
                }
            }
        );

        $.get(
            "/api/statistics/totaldealergms", { startDate: startOfDay, endDate: sdString },
            function (cdata) {
                let logMessage = "setting current total (" +
                        currentInstance.numberFormat.format(currentInstance.totalDealerGms) +
                        ") to " +
                        currentInstance.numberFormat.format(cdata);
                if (cdata)
                    
                    if (currentInstance.totalDealerGms > cdata) {
                        console.error("[OVERRUN] "+logMessage);
                    } else {
                        console.log(logMessage);
                    }
                console.log("climbing " + currentInstance.numberFormat.format(maxAmount) + " to " + currentInstance.numberFormat.format(cdata + maxAmount) + " at " + currentInstance.numberFormat.format(currentInstance.updateRate * (1000 / currentInstance.frameLengthMilliseconds)) + ' per second');

                currentInstance.totalDealerGms = cdata;
         
            }
        );

    }
    
    updateEvents() {

        this.currentTime = moment();
        let offsetTime = moment().subtract(this.localPlaybackOffset, "m");

        //dy/dx
        this.totalDealerGms += this.updateRate;

        if (this.currentTime.isSameOrAfter(this.nextUpdateDue)) {
            this.getNewEvents(offsetTime, this.currentTime);
            // set when last update occured
            this.nextUpdateDue = moment(this.currentTime).add(this.localPlaybackOffset, "m");
          }

        for (var i = 0; i < this.totalDealerGmsStats.length; i++) {
            let event = this.totalDealerGmsStats[i];
            let offset = offsetTime.toISOString();
            let occ = event.OccuredOn.toISOString();
            if (offsetTime.isSameOrAfter(event.OccuredOn)) {
               // this.totalDealerGms += event.StartStat;
                this.totalDealerGmsStats.splice(i, 1);
            }
        }
        if (this.totalDealerGms > 0) {
            this.totalDealerElement.text(this.numberFormat.format(this.totalDealerGms));
        }
    }
}