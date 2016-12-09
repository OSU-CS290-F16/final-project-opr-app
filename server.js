var request = require('request');
var path = require('path');
var M = require('m4th/matrix');
var m4th = require('m4th')
var express = require('express');
var exphbs = require('express-handlebars');
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;

var app = express();
var port = process.env.PORT || 3000;

var db_url = 'mongodb://localhost:27017/OPR'
var mongodb;

app.engine('handlebars', exphbs({ defaultLayout: 'main' }))
app.set('view engine', 'handlebars');

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')))


app.get('/', function (req, res) {
	res.render('index-page', {
		title: "OPR"
	})
})


app.get('/events/:event', function(req, res) {

	event_code = 'event/2015' + req.params.event;

	mongodb.collection('events').find({"code": event_code}).toArray(function (err, events) {
			if(events.length == 0) {
				console.log("== Item not in database.");

				tba_api(event_code + '/rankings', (teams)=>{
					tba_api(event_code + '/matches', (matches)=>{

						var team_list = [];
						var team_dict = {};
						for(var i = 1; i < teams.length; i++) {
							team_dict['frc'+teams[i][1]] = i - 1;
							team_list.push(teams[i][1]);
						}

						var score_vector = M(matches.length, 1);

						var qm_count = 0;
						for(var i = 0; i < matches.length; i++)
							if(matches[i].comp_level === "qm")
								if(matches[i].score_breakdown.blue.auto !== null)
									qm_count++;

						var p_matrix = M(qm_count * 2, team_list.length);
						for(var r = 0; r < p_matrix.rows; r++)
							for(var c = 0; c < p_matrix.columns; c++)
								p_matrix.set(r, c, 0);

						var j = 0;
						for(var i = 0; i < matches.length; i++)
						{
							if(matches[i].comp_level === "qm")
							{
								if(matches[i].score_breakdown.blue.auto !== null)
								{
									matches[i].alliances.red.teams.forEach((team) => {
										p_matrix.set(j, team_dict[team], 1);
									});

									score_vector.set(j, 0, matches[i].alliances.red.score);


									matches[i].alliances.blue.teams.forEach((team) => {
										p_matrix.set(j + 1, team_dict[team], 1);

									});

									score_vector.set(j, 0, matches[i].alliances.blue.score);
									j += 2;
								}					
							}
						}
/*
						for(var r = 0; r < p_matrix.rows; r++)
						{
							console.log('')
							for(var c = 0; c < p_matrix.columns; c++)
								console.log(p_matrix.get(r, c));
						}
*/
						opr_vector = m4th.lu(p_matrix.transp().mult(p_matrix)).getInverse().mult(p_matrix.transp()).mult(score_vector);

						opr_list = [];
						for(var r = 0; r < opr_vector.rows; r++)
							opr_list.push(opr_vector.get(r, 1));

						var event = {
							code: event_code,
							headers: ["Team #", "OPR"],
							"OPR": opr_list,
							"Team #": team_list,	
						}

						mongodb.collection('events').insertOne(event);
					});
				});
			}
			else {
				console.log("== Item in database.");
			}
	});

	console.log("== First callbacks returned.")
	mongodb.collection('events').find({"code": event_code}).toArray(function (err, events) {
		if(events.length != 0) {
			ev = events[0];

			var rows = ev[ev.headers[0]].length;
			var cols = ev.headers.length;

			var table = new Array(rows);
			for(var r = 0;  r < rows; r++) {
				table[r] = new Array(cols);
				for(var c = 0; c < cols; c++) {
					table[r][c] = ev[ev.headers[c]][r];
				}
			}

			res.render('event-page', {
					title: req.params.event,
					header: ev.headers,
					rows: table
			});
		}

		else {
			console.log("== Error matching team.")
		}
	});
});


app.get('*', function(req, res) {
  res.status(404).render('404-page', {
  });
});


MongoClient.connect(db_url, function(err, db) {
	if (err) {
		console.log("== Unable to connect to MongoDB.");
		throw err;
	}

	mongodb = db;

	app.listen(port, function () {
  		console.log("== Listening on port", port);
	});
})


var tba_api = function(code, callback) {
	var API_URL = 'https://www.thebluealliance.com/api/v2/';
	var API_ID = '?X-TBA-App-Id=frc955:opr-system:v03';

	request(API_URL + code + API_ID, function(err, res, content) {
		if(err)
		{
			console.log("== Error fetching API data.");
			throw err;
		}

		content = JSON.parse(content);

		callback(content);
	})
}