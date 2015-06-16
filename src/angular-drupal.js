/**
 * The angular-drupal module.
 */
angular.module('angular-drupal', []).
  service('drupal', ['$http', 'drupalSettings', drupal]).
  value('drupalSettings', null).
  value('drupalToken', null).
  value('drupalUser', null);

/**
 * The drupal service for the angular-drupal module.
 */
function drupal($http, drupalSettings, drupalToken) {

  // GLOBALS
  var sitePath = drupalSettings.sitePath;
  var restPath = sitePath + '/?q=' + drupalSettings.endpoint;
  this.sitePath = sitePath;
  this.restPath = restPath;

  // TOKEN (X-CSRF-Token)
  this.token = function() {

    // @TODO depending on how deeply nested we are in "then" promises, we're
    // losing track of the drupal and drupal.Token object as each scope
    // progresses.
    if (typeof this.drupal !== 'undefined') {
      if (this.drupal.drupalToken) {
        console.log('grabbed token from "this" memory: ' + drupalToken);
        return this.drupal.drupalToken;
      }
    }
    else if (drupalToken) {
      console.log('grabbed token from memory: ' + drupalToken);
      return drupalToken;
    }
    return $http.get(sitePath + '/?q=services/session/token').then(function(result) {
        if (result.status == 200) {
          drupalToken = result.data;
          //console.log('grabbed token from server: ' + drupalToken);
          return drupalToken;
        }
    });
  };

  // SYSTEM CONNECT
  this.connect = function() {
    var _token_fn = typeof this.token !== 'undefined' ?
      this.token : this.drupal.token;
    return _token_fn().then(function(token) {
        return $http({
          method: 'POST',
          url: restPath + '/system/connect.json',
          headers: { 'X-CSRF-Token': token } 
        }).then(function(result) {
          if (result.status == 200) { return result.data; }
        });
    });
  };

  // USER LOGIN
  this.user_login = function(username, password) {

    // @TODO logging in takes 3 calls to the server (logging in, grabbing a new
    // token, then system connecting), this should be a single service resource
    // (like it used to be in the early DrupalGap days). This should be
    // included with the angular_drupal drupal module (yet to be created).

    var drupal = this;
    return $http({
        method: 'POST',
        url: restPath + '/user/login.json',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        transformRequest: function(obj) {
          var str = [];
          for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
          return str.join("&");
        },
        data: {
          username: username,
          password: password
        }
    }).then(function(result) {
      drupal.drupalUser = result.user;
      drupal.drupalToken = null;
      return drupal.connect();
    });

  };

  // USER LOGOUT
  this.user_logout = function() {
    var drupal = this;
    return this.token().then(function(token) {
        return $http({
            method: 'POST',
            url: restPath + '/user/logout.json',
            headers: { 'X-CSRF-Token': token }
        }).then(function(result) {
          this.drupal.drupalUser = drupal_user_defaults();
          this.drupal.drupalToken = null;
          return drupal.connect();
        });
    });
  };

  // USER REGISTER
  /*this.user_register = function(account) {

    var options = {
      method: 'POST',
      url: this.restPath + '/user/register.json',
      headers: {
        'Content-Type': 'application/json'
      },
      data: { account: account }
    };
    if (!Drupal.sessid) {
      // @TODO this is returning the token instead of the user registration
      // result, learn how to use promises...?
      return $http.get(this.sitePath + '/?q=services/session/token').success(function(token) {
          Drupal.sessid = token;
          options.headers['X-CSRF-Token'] = token;
          return $http(options);
      });
    }
    options.headers['X-CSRF-Token'] = Drupal.sessid;
    return $http(options);
    
  };*/
  
  // ENTITY LOAD FUNCTIONS
  
  this.comment_load = function(cid) {
    return $http.get(this.restPath + '/comment/' + cid + '.json').then(function(result) {
        if (result.status == 200) { return result.data; }
    });
  };
  
  this.file_load = function(fid) {
    return $http.get(this.restPath + '/file/' + fid + '.json').then(function(result) {
        if (result.status == 200) { return result.data; }
    });
  };
  
  this.node_load = function(nid) {
    return $http.get(this.restPath + '/node/' + nid + '.json').then(function(result) {
        if (result.status == 200) { return result.data; }
    });
  };
  
  this.taxonomy_term_load = function(tid) {
    return $http.get(this.restPath + '/taxonomy_term/' + tid + '.json').then(function(result) {
        if (result.status == 200) { return result.data; }
    });
  };
  
  this.taxonomy_vocabulary_load = function(vid) {
    return $http.get(this.restPath + '/taxonomy_vocabulary/' + vid + '.json').then(function(result) {
        if (result.status == 200) { return result.data; }
    });
  };

  this.user_load = function(uid) {
    return $http.get(this.restPath + '/user/' + uid + '.json').then(function(result) {
        if (result.status == 200) { return result.data; }
    });
  };

  

  // NODE SAVE  
  this.node_save = function(node) {
    var method = null;
    var url = null;
    if (!node.nid) {
      method = 'POST';
      url = this.restPath + '/node.json';
    }
    else {
      method = 'PUT';
      url = this.restPath + '/node/' + node.nid + '.json';
    }
    var options = {
      method: method,
      url: url,
      headers: {
        'Content-Type': 'application/json'
      },
      data: { node: node }
    };
    if (!Drupal.sessid) {
      // @TODO this is returning the token instead of the user registration
      // result, learn how to use promises...?
      return $http.get(this.sitePath + '/?q=services/session/token').then(function(response) {
          dpm('thenning!');
          dpm(response);
          Drupal.sessid = response.data;
          options.headers['X-CSRF-Token'] = response.data;
          return $http(options);
      }).then(function(response) {
        return response.data
      });
    }
    options.headers['X-CSRF-Token'] = Drupal.sessid;
    return $http(options);
  };

}

/**
 * Returns an array of entity type names.
 * @return {Array}
 */
function drupal_entity_types() {
  try {
    return [
      'comment',
      'file',
      'node',
      'taxonomy_term',
      'taxonomy_vocabulary',
      'user'
    ];
  }
  catch (error) { console.log('drupal_entity_types - ' + error); }
}

/**
 * Returns an entity type's primary key.
 * @param {String} entity_type
 * @return {String}
 */
function drupal_entity_primary_key(entity_type) {
  try {
    var key;
    switch (entity_type) {
      case 'comment': key = 'cid'; break;
      case 'file': key = 'fid'; break;
      case 'node': key = 'nid'; break;
      case 'taxonomy_term': key = 'tid'; break;
      case 'taxonomy_vocabulary': key = 'vid'; break;
      case 'user': key = 'uid'; break;
      default:
        // Is anyone declaring the primary key for this entity type?
        var function_name = entity_type + '_primary_key';
        if (drupal_function_exists(function_name)) {
          var fn = window[function_name];
          key = fn(entity_type);
        }
        else {
          var msg = 'drupal_entity_primary_key - unsupported entity type (' +
            entity_type + ') - to add support, declare ' + function_name +
            '() and have it return the primary key column name as a string';
          console.log(msg);
        }
        break;
    }
    return key;
  }
  catch (error) { console.log('drupal_entity_primary_key - ' + error); }
}

/**
 * Returns an entity type's primary title key.
 * @param {String} entity_type
 * @return {String}
 */
function drupal_entity_primary_key_title(entity_type) {
  try {
    var key;
    switch (entity_type) {
      case 'comment': key = 'subject'; break;
      case 'file': key = 'filename'; break;
      case 'node': key = 'title'; break;
      case 'taxonomy_term': key = 'name'; break;
      case 'taxonomy_vocabulary': key = 'name'; break;
      case 'user': key = 'name'; break;
      default:
        console.log(
          'drupal_entity_primary_key_title - unsupported entity type (' +
            entity_type +
          ')'
        );
        break;
    }
    return key;
  }
  catch (error) { console.log('drupal_entity_primary_key_title - ' + error); }
}

/**
 * Given a JS function name, this returns true if the function exists in the
 * scope, false otherwise.
 * @param {String} name
 * @return {Boolean}
 */
function drupal_function_exists(name) {
  try {
    return (eval('typeof ' + name) == 'function');
  }
  catch (error) {
    alert('drupal_function_exists - ' + error);
  }
}

/**
 * Returns a default JSON object representing an anonymous Drupal user account.
 * @return {Object}
 */
function drupal_user_defaults() {
  try {
    return {
      uid: '0',
      roles: {'1': 'anonymous user'},
      permissions: []
    };
  }
  catch (error) { console.log('drupal_user_defaults - ' + error); }
}

