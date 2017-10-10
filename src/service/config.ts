/// <reference path="../common/models.ts" />

import Utils = require("./utils");
import _ = require("lodash");
import fs = require("fs");
import log from "./logging";

export interface IConfigProvider {
    GetString(configKey: string): string;
    GetNumber(configKey: string): number;
    GetBoolean(configKey: string): boolean;
    Has(configKey: string): boolean;
    inBacktestMode: boolean;
}

export class ConfigProvider implements IConfigProvider {
    private static Log = log("tribeca:config");
    private _config: { [key: string]: string } = {};
    private _priorityconfig: { [key: string]: string } = {};
    private _configfile;
    private _priorityConfigFile = 'priority.config.json';
    constructor() {
        this.inBacktestMode = (process.env["TRIBECA_BACKTEST_MODE"] || "false") === "true";
        this._configfile = process.env["TRIBECA_CONFIG_FILE"] || "tribeca.json";

        if (fs.existsSync(this._configfile)) {
            this._config = JSON.parse(fs.readFileSync(this._configfile, "utf-8"));
        }
        if (!fs.existsSync(this._priorityConfigFile)) {
            fs.writeFileSync(this._priorityConfigFile, JSON.stringify({}));
        }
        else {
            try{
                this._priorityconfig = JSON.parse(fs.readFileSync(this._priorityConfigFile, "utf-8"));
                console.log(this._priorityconfig);
            }
            catch(err){
                if (err) console.log(err);
            }
        }
    }

    public GetBoolean = (configKey: string): boolean => {
            return this.Fetch<boolean>(configKey, true, x => x == true || x == "true");
    };

    public Has = (configKey: string): boolean => {
        return (this.Fetch(configKey, false, x => x)) !== null;
    };

    public GetNumber = (configKey: string): number => {
        return this.Fetch<number>(configKey, true, x => {
            if (typeof x === "number") return x;
            if (typeof x === "string") return parseFloat(x);
            else return parseFloat(x.toString());
        });
    };

    public GetString = (configKey: string): string => {
        return this.Fetch<string>(configKey, true, x => x.toString());
    };
    
    public WritePriority = (configKey: string, value: any) => {
        let priorityConfigObject = JSON.parse(fs.readFileSync(this._priorityConfigFile, "utf-8"));
        priorityConfigObject[configKey] = value;
        console.log(JSON.stringify(priorityConfigObject));
        fs.writeFileSync(this._priorityConfigFile, JSON.stringify(priorityConfigObject));
        ConfigProvider.Log.info("%s = %s", configKey, value);
        return true;
    };

    private Fetch = <T>(configKey: string, throwIfMissing: boolean, cvt: (d: Object) => T): T => {
        let value : any = null;
        if (this._priorityconfig.hasOwnProperty(configKey))
            return cvt(this._priorityconfig[configKey]);

        else if (process.env.hasOwnProperty(configKey))
            return cvt(process.env[configKey]);
        
        else if (this._config.hasOwnProperty(configKey))
            return cvt(this._config[configKey]);
        
        else if (throwIfMissing)
            throw Error("Config does not have property " + configKey);
    };
    
    inBacktestMode: boolean = false;
}