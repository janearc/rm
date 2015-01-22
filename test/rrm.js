var rrm        = require( '../lib/rrm' )
	, mock_riak  = { }
	, mock_store = { }
	, crypto     = require( 'crypto' )
	, q          = require( 'q' )
	, chai       = require( 'chai' )
	, cap        = require( 'chai-as-promised' )
	, assert     = require( 'assert' )
	, sinon      = require( 'sinon' );

chai.use( cap );

var Schema = {
	'Automobile': {
		'name'    : { 'isa': 'string', 'defined': true, 'distinct': true },
		'hasone'  : [ 'Manufacturer' ],
		'hasmany' : [ 'repair', 'part' ]
	},
	'Manufacturer': {
		'name'    : { 'isa': 'string', 'defined': true, 'distinct': true, 'verified': 'RESERVED' },
		'hasmany' : [ 'Automobile', 'Model' ]
	},
	'defined' : 1
};

// Mock riak-dc {{{

function get_buckets () { // {{{
	// get_buckets returns a (promise of a) list of all the buckets riak knows about.
	//

	var deferred = q.defer()
		, buckets  = Object.keys(Schema);

	deferred.resolve( buckets );

	return deferred.promise;

} // }}} get_buckets

function get_keys (bucket) { // {{{
	var deferred = q.defer()
		, keys     = [ ];
	
	if (bucket == 'prototypes') {
		deferred.resolve( Object.keys( Schema ) );
		return deferred.promise;
	}

	var keys = mock_store[bucket].forEach( function (object) { 
		keys.push( object['serial'] );
	} );

	deferred.resolve( keys );

	return deferred.promise;

} // }}} get_keys

function get_tuple (bucket, key) { // {{{
	console.log( bucket + '/' + key );
	var deferred = q.defer()
		, tuple    = dg.deeply( mock_store[bucket], function (t) { if (t['serial'] == key) return 1 } );

	deferred.resolve( tuple );

	return deferred.promise;
} // }}} get_tuple

function del_tuple (bucket, key) { // {{{
	var deferred = q.defer();

	Schema = jgrep.sync( { 'function' : function (t) { if (t['serial'] != key) { return 1 } } }, Schema[bucket] )

	return deferred.promise;
} // }}} del_tuple

function put_tuple (bucket, payload, forced_key) { // {{{
	var deferred = q.defer()
		, serial   = gen_serial();

	payload['serial'] = serial;

	if (!mock_store[bucket]) {
		mock_store[bucket] = [ ];
	}

	mock_store[bucket].push( payload );

	deferred.resolve( serial );

	return deferred.promise;

} // }}} put_tuple

function gen_serial () { // {{{
	return crypto.randomBytes( Math.ceil(32) ).toString('hex');
} // }}}

mock_riak.get_keys    = get_keys;
mock_riak.get_tuple   = get_tuple;
mock_riak.get_buckets = get_buckets;
mock_riak.put_tuple   = put_tuple;
mock_riak.del_tuple   = del_tuple;

// }}}

it( 'test schema passes syntax/interpeter check', function () { assert( Schema ) } );

// set_riak_handle( handle ) {{{
//

it( 'rrm set_riak_handle', function () {
	assert.deepEqual(
		rrm.set_riak_handle( mock_riak ),
		mock_riak,
		'mock object returned'
	)
} );

// }}}

// set_schema( schema ) {{{
//

it( 'rrm set_schema', function () {
	assert.deepEqual(
		rrm.set_schema( Schema ),
		Schema,
		'mock schema returned'
	)
} );

// }}}

// object_types( ) {{{
//

it( 'rrm object_types', function () {
	return rrm.object_types().then( function (types) {
		types.forEach( function (t) { assert( typeof t == 'string', 'list of strings returned' ) } );
		assert.deepEqual( types, [ 'Automobile', 'Manufacturer' ], 'list of types correct' );
	} );
} );

// }}}

// new_object( type ) {{{
//

it( 'rmm new_object', function () {
	assert( rrm.new_object( 'Automobile' ), 'object returned' );
	assert.deepEqual( rrm.new_object( 'Automobile' ), { 'name': '' }, 'correctly-formed object' );
	assert( rrm.new_object( 'Manufacturer' ), 'object returned' );
	assert.deepEqual( rrm.new_object( 'Manufacturer' ), { 'name': '' }, 'correctly-formed object' );
} );

// }}}

// get_schema( ) {{{
//

it( 'rrm get_schema', function () {
	return rrm.get_schema().then( function (s) {
		assert( s, 'schema returned' );
		assert.deepEqual( s, Schema, 'schema is correct' );
	} );
} );

// }}}

// add_object( type, object ) {{{
//
it( 'rrm add_object', function () {
	var auto = rrm.new_object( 'Automobile' );
	auto['name'] = 'Ford Edsel';
	return rrm.add_object( 'Automobile', auto ).then( function (serial) {
		// We can't really inspect this further.
		//
		assert( serial, 'serial returned' );
	} );
} );

// }}}

// get_objects( type ) {{{
//

it( 'rrm get_objects', function () {
	var auto = rrm.new_object( 'Automobile' );
	auto['name'] = 'Pontiac Aztek';
	rrm.add_object( 'Automobile', auto ).then( function (serial) {
		return rrm.object_types().then( function (types) { types.forEach( function (type) {
			return rrm.get_objects( type ).then( function (objects) {
				objects.forEach( function (object) {
					assert( object, 'object defined' );
				} )
			} )
		} ) } )
	} )
} );

// }}}

// del_object( type, object ) {{{
//
it( 'rrm del_object', function () {
	var auto = rrm.new_object( 'Automobile' );
	auto['name'] = 'Toyota Previa';
	rrm.add_object( 'Automobile', auto ).then( function (serial) {
		return rrm.del_object( 'Automobile', serial ).then( function () {
			assert( 0, 'return from del_object is not good.' );
		} )
	} )
} );

// }}}

// update_object( type, object )
//
// TODO
//
