/// <reference path="../common/models.ts" />

import Utils = require("./utils");
import _ = require("lodash");
import fs = require("fs");
import log from "./logging";

export interface IConfigProvider {
    GetString(configKey: string): string;
    GetNumber(configKey: string): number;
    
    inBacktestMode: boolean;
}

export class ConfigProvider implements IConfigProvider {
    private static Log = log("tribeca:config");
    private _config: { [key: string]: string } = {};
    private _priorityconfig: { [key: string]: string } = {};
    private _configfile;
    private _priorityConfigFile = './priority.config.json';
    constructor() {
        this.inBacktestMode = (process.env["TRIBECA_BACKTEST_MODE"] || "false") === "true";
        this._configfile = process.env["TRIBECA_CONFIG_FILE"] || "tribeca.json";
        console.log(process.env["TRIBECA_CONFIG_FILE"]);
        console.log(this._configfile);

        if (fs.existsSync(this._configfile)) {
            console.log("config file exists");
            this._config = JSON.parse(fs.readFileSync(this._configfile, "utf-8"));
        }
        if (!fs.existsSync(this._priorityConfigFile)) {
            fs.writeFileSync(this._priorityConfigFile, JSON.stringify({}));
        }
        else {
            try{
                this._priorityconfig = JSON.parse(fs.readFileSync(this._priorityConfigFile, "utf-8"));
            }
            catch(err){
                if (err) console.log(err);
            }
        }
    }

    public GetNumber = (configKey: string): number => {
        return parseFloat(this.GetString(configKey));
    };

    public GetString = (configKey: string): string => {
        var value = this.Fetch(configKey);
        ConfigProvider.Log.info("%s = %s", configKey, value);
        return value;
    };
    
    public WritePriority = (configKey: string, value: any) => {
        let priorityConfigObject = JSON.parse(fs.readFileSync(this._priorityConfigFile, "utf-8"));
        priorityConfigObject[configKey] = value;
        console.log(JSON.stringify(priorityConfigObject));
        fs.writeFileSync(this._priorityConfigFile, JSON.stringify(priorityConfigObject));
        ConfigProvider.Log.info("%s = %s", configKey, value);
        return true;
    };

    private Fetch = (configKey: string): string => {
        if (this._priorityconfig.hasOwnProperty(configKey))
            return  this._priorityconfig[configKey];

        if (process.env.hasOwnProperty(configKey))
            return process.env[configKey];
        
        if (this._config.hasOwnProperty(configKey))
            return this._config[configKey];

        throw Error("Config does not have property " + configKey);
    };
    
    inBacktestMode: boolean = false;
}