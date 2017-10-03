/// <reference path="../common/models.ts" />
/// <reference path="orderlist.ts"/>
/// <reference path="trades.ts"/>
/// <reference path="../common/messaging.ts"/>
/// <reference path="shared_directives.ts"/>
/// <reference path="pair.ts"/>
/// <reference path="market-quoting.ts"/>
/// <reference path="market-trades.ts"/>
/// <reference path="position.ts"/>
/// <reference path="target-base-position.ts"/>
/// <reference path="trade-safety.ts"/>

(<any>global).jQuery = require("jquery");
import angular = require("angular");

var ui_bootstrap = require("angular-ui-bootstrap");
var ngGrid = require("../ui-grid.min");
var bootstrap = require("../bootstrap.min");

import Models = require("../common/models");
import moment = require("moment");
import OrderList = require("./orderlist");
import Trades = require("./trades");
import Messaging = require("../common/messaging");
import Shared = require("./shared_directives");
import Pair = require("./pair");
import MarketQuoting = require("./market-quoting");
import MarketTrades = require("./market-trades");
import Messages = require("./messages");
import Position = require("./position");
import Tbp = require("./target-base-position");
import TradeSafety = require("./trade-safety");

interface MainWindowScope extends ng.IScope {
    env : string;
    connected : boolean;
    order : DisplayOrder;
    pair : Pair.DisplayPair;
    exch_name : string;
    pair_name : string;
    exch_list: any;
    selectedExchange: string;
    selectedPair: string;
    selectedQuote: string;
    selectedShowOrders: string;
    base_list: any;
    quote_list: any;
    cancelAllOrders();
    setExchange(ex: string);
}

class DisplayOrder {
    side : string;
    price : number;
    quantity : number;
    timeInForce : string;
    orderType : string;

    availableSides : string[];
    availableTifs : string[];
    availableOrderTypes : string[];

    private static getNames(enumObject : any) {
        var names : string[] = [];
        for (var mem in enumObject) {
            if (!enumObject.hasOwnProperty(mem)) continue;
            if (parseInt(mem, 10) >= 0) {
              names.push(enumObject[mem]);
            }
        }
        return names;
    }

    private _fire : Messaging.IFire<Models.OrderRequestFromUI>;
    constructor(fireFactory : Shared.FireFactory, private _log : ng.ILogService) {
        this.availableSides = DisplayOrder.getNames(Models.Side);
        this.availableTifs = DisplayOrder.getNames(Models.TimeInForce);
        this.availableOrderTypes = DisplayOrder.getNames(Models.OrderType);

        this._fire = fireFactory.getFire(Messaging.Topics.SubmitNewOrder);
    }

    public submit = () => {
        var msg = new Models.OrderRequestFromUI(this.side, this.price, this.quantity, this.timeInForce, this.orderType);
        this._log.info("submitting order", msg);
        this._fire.fire(msg);
    };
}

var uiCtrl = ($scope : MainWindowScope,
              $timeout : ng.ITimeoutService,
              $log : ng.ILogService,
              subscriberFactory : Shared.SubscriberFactory,
              fireFactory : Shared.FireFactory,
              product: Shared.ProductState) => {
    
    var cancelAllFirer = fireFactory.getFire(Messaging.Topics.CancelAllOrders);
    $scope.cancelAllOrders = () => cancelAllFirer.fire(new Models.CancelAllOrdersRequest());

    var writeConfigValueFirer = fireFactory.getFire(Messaging.Topics.WriteConfigValue);
    $scope.writeConfigValue = (key: string, value: any) => writeConfigValueFirer.fire(new Models.WriteConfigRequest(key, value));
    
    $scope.GetTradedPair = (pair: string, quote: string) => {
        console.log(pair);
        if ((pair === undefined) || (quote === undefined)) return;
        $scope.writeConfigValue('TradedPair', pair + '/' + quote);
    }

    $scope.order = new DisplayOrder(fireFactory, $log);
    $scope.pair = null;

    $scope.base_list = [];
    for(var n in Models.Currency) {
        $scope.base_list.push({name: <any>Models.Currency[n]});
    }

    var onAdvert = (pa : Models.ProductAdvertisement) => {
        $log.info("advert", pa);
        $scope.connected = true;
        $scope.env = pa.environment;
        $scope.pair_name = Models.Currency[pa.pair.base] + "/" + Models.Currency[pa.pair.quote];
        $scope.exch_name = Models.Exchange[pa.exchange];
        $scope.exch_list = [{name:"Null", value:"Null"}, {name:"Coinbase", value:"Coinbase"}, {name:"HitBtc", value:"HitBtc"}, {name:"OkCoin", value:"OkCoin"}, {name:"Bitfinex", value:"Bitfinex"}];
        $scope.base_list;
        $scope.quote_list = $scope.base_list;
        $scope.showorders_list = [{name:"All", value:"All"},{name:"Filter", value:"Filter"}];
        $scope.pair = new Pair.DisplayPair($scope, subscriberFactory, fireFactory);
        $scope.selectedExchange = Models.Exchange[pa.exchange];
        $scope.selectedBase = Models.Currency[pa.pair.base];
        $scope.selectedQuote = Models.Currency[pa.pair.quote];
        product.advert = pa;
        product.fixed = -1*Math.floor(Math.log10(pa.minTick)); 
    };

    var reset = (reason : string, connected: boolean) => {
        $log.info("reset", reason);
        $scope.connected = connected;

        if (connected) {
            $scope.pair_name = null;
            $scope.exch_name = null;

            if ($scope.pair !== null)
                $scope.pair.dispose();
            $scope.pair = null;
        }
    };
    reset("startup", false);

    var sub = subscriberFactory.getSubscriber($scope, Messaging.Topics.ProductAdvertisement)
        .registerSubscriber(onAdvert, a => a.forEach(onAdvert))
        .registerConnectHandler(() => reset("connect", true))
        .registerDisconnectedHandler(() => reset("disconnect", false));

    $scope.$on('$destroy', () => {
        sub.disconnect();
        $log.info("destroy client");
    });

    $log.info("started client");
};

var requires = ['ui.bootstrap',
                'ui.grid',
                OrderList.orderListDirective,
                Trades.tradeListDirective,
                MarketQuoting.marketQuotingDirective,
                MarketTrades.marketTradeDirective,
                Messages.messagesDirective, 
                Position.positionDirective,
                Tbp.targetBasePositionDirective,
                TradeSafety.tradeSafetyDirective,
                Shared.sharedDirectives];

angular.module('projectApp', requires)
       .controller('uiCtrl', uiCtrl);