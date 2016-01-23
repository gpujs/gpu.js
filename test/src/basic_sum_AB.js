function basic_sum_AB_test( assert, mode ) {
	var f = GPU(function(a, b) {
		var ret = a[this.thread.x] + b[this.thread.x];
		return ret;
	}, {
		thread : [3],
		block : [1],
		mode : mode
	});
	
	assert.ok( f !== null, "function generated test");
	assert.deepEqual(f( [1, 2, 3], [4, 5, 6] ), [5, 7, 9], "basic sum function test");
}

QUnit.test( "basic_sum_AB (auto)", function( assert ) {
	basic_sum_AB_test(assert, null);
});

QUnit.test( "basic_sum_AB (GPU)", function( assert ) {
	basic_sum_AB_test(assert, "gpu");
});

QUnit.test( "basic_sum_AB (CPU)", function( assert ) {
	basic_sum_AB_test(assert, "cpu");
});

/*
// EXAMPLE GLSL

// boilerplate begin!!!
float _W_ = XXXX; // HARDCODE FROM PARSER
float _H_ = XXXX; // HARDCODE FROM PARSER

float _blockX_ = 1; // HARDCODE FROM PARSER
float _blockY_ = 1; // HARDCODE FROM PARSER
float _blockZ_ = 1; // HARDCODE FROM PARSER
float _blockDimX_ = 1; // HARDCODE FROM PARSER
float _blockDimY_ = 1; // HARDCODE FROM PARSER
float _blockDimZ_ = 1; // HARDCODE FROM PARSER
float _threadDimX_ = 1; // HARDCODE FROM PARSER
float _threadDimY_ = 1; // HARDCODE FROM PARSER
float _threadDimZ_ = 1; // HARDCODE FROM PARSER

float _coordToIndex_(vec3 coord) {
	return coord.x + _threadDimX_ * (coord.y + _threadDimY_ * coord.z);
}

vec3 _indexTo3DCoord_(float index) {
	vec3 ret;
	
	ret.z = round(index / (_threadDimX_ * _threadDimY_));
	ret.y = round((index - ret.z * _threadDimY_) / _threadDimX_);
	ret.x = index - _threadDimX_ * (ret.y + _threadDimY_ * ret.z);
	
	return ret;
}

vec2 _indexTo2DCoord_(float index) {
	vec2 ret;
	
	ret.y = mod(index, _W_) / _H_;
	ret.x = (round(index / _W_)) / _W_;
	
	return ret;
}

float _coordToIndex_(vec2 coord) {
	return (coord.x * _W_) + _W_ * (coord.y * _H_);
}

void main(float* a, float* b) {
    vec2 _vecId_ = get_global_id();
	float _id_ = _vecId_.x + _vecId_.y * _W_;
	
	vec3 _thread_ = _indexTo3D_(_id_);
	
	float _threadZ_ =  _thread_.z;
	float _threadY_ =  _thread_.y;
	float _threadX_ =  _thread_.x;
// boilerplate end!!!
	
	float ret = a[_indexTo2DCoord_(_threadX_)] + b[_indexTo2DCoord_(_threadX_)];
	out_float = ret; // FROM RETURN
	return;
}
 */
