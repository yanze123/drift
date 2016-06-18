//引入包
var redis = require('redis')
var uuid = require('node-uuid')

//定义瓶子的类型
var type = {
	male: 0,
	female: 1
}

/**
 * 扔漂流瓶
 *
 * @param {obj} bottle 漂流瓶对象
 * @param {function} callback 回调函数
 */
function throwBottle(bottle, callback) {
	//创建redis连接
	var client = redis.createClient()
	//生成漂流瓶id
	var bottleId = uuid.v4()
	//漂流瓶创建时间
	bottle.time = bottle.time || Date.now()
	// 根据漂流瓶类型选择数据库
    // male 类型漂流瓶保存到 0 号数据库
    // female 类型漂流瓶保存到 1 号数据库
    client.select(type[bottle.type], function(){
    	//使用hash类型保存漂流瓶对象
    	client.hmset(bottleId, bottle, function(err, result){
    		//扔瓶子失败
    		if(err) {
    			return callback({ code:0, msg:'过会儿再试把！'})
    		}
    		//设置漂流瓶生存期，一天后没有人捡到瓶子，就会被redis删除
    		client.expire(bottleId, 24*60*60, function(){
    			//释放连接
    			client.quit();
    		});
    		callback({ code: 1, msg:'你成功扔出来一个漂流瓶！'})
    	});
    });
}

/**
 * 捡漂流瓶
 *
 * @param {obj} info 捡瓶子的用户对象
 * @param {function} callback 回调函数
 */

 function pickBottle(info, callback) {
 	//创建redis连接
 	var client = redis.createClient();
 	// 根据用户性别选择数据库
    // male 选择 0 号数据库
    // female 选择 1 号数据库
    client.select(type[info.type], function(){
    	//从redis数据库中随机取出一个瓶子
    	client.randomkey(function(err, bottleId){
    		if(err) {
    			return callback({code: 0, msg: err})
    		}
    		//没有取到漂流瓶时返回海星
    		if(!bottleId) {
    			return callback({code: 0,msg: '您捞到一个海星～'});
    		}
    		//取到瓶子,通过id查询该瓶子的所有信息并调出
    		client.hgetall(bottleId, function(err,bottle){
    			if(err) {
    				return callback({code: 0, msg:'这个瓶子破损来。。。'})
    			}
    			// 读取瓶子内容成功
                // 从 redis 数据库删除此瓶子
                client.del(bottleId, function(){
                	//释放连接
                	client.quit();
                });

                //返回结果
                callback({code:1, msg: bottle})
    		})
    	})
    })
 }

exports.throw = function(bottle, callback) {
	throwBottle(bottle,function(result){
		callback(result);
	})
}

exports.pick = function(info, callback) {
	//百分之20概率捡到海星
	if(Math.random()<= 0.2){
		return callback({code:1 , msg:'您捞到来一个海星～'})
	}
	pickBottle(info, function(result) {
		callback(result);
	});
}