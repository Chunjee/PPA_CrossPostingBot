class Tweet {
    static numberoftweets:number = 0;

    public _text:string;
    public _permalink:string;
    public _username:string;
    public _tweetobject:any;

    public _originaltext:string;

	//Constructor
    constructor(obj) {
        Tweet.numberoftweets++;
        this._originaltext = obj.text;
        this._text = obj.text.replace(/(?:https?|ftp):\/\/[\n\S]+/gi, '');
        this._permalink = "https://twitter.com/dsmart/status/" + obj.id_str;
        this._username = obj.user.name
		this._tweetobject = obj;

		//write it to file so we have some to inspect
        var fs = require('fs');
		fs.appendFileSync(process.cwd() + '/tweets.dat', JSON.stringify(this) + "\n||\n");
    }

    static howManytweets(): number {
        return Tweet.numberoftweets;
    }

    private _weight: number

    BlankMethod(para_input) {
		//does nothing
    }
}

export = Tweet;
