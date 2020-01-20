/**
 * The only file that is making calls to Backend. You shouldn't use it directly,
 * but through proper actions in `jsapp/js/actions.es6`.
 *
 * TODO: Instead of splitting this huge file it could be a good idead to move
 * all the calls from here to appropriate actions and drop this file entirely.
 * And make actions for calls that doesn't have them.
 */

import $ from 'jquery';
import alertify from 'alertifyjs';
import {
  t,
  assign
} from './utils';
import {
  ROOT_URL,
  COMMON_QUERIES
} from './constants';

export var dataInterface;
(function(){
  var $ajax = (o)=> {
    return $.ajax(assign({}, {dataType: 'json', method: 'GET'}, o));
  };
  const assetMapping = {
    'a': 'assets',
    'c': 'collections',
    'p': 'permissions',
  };

  // hook up to all AJAX requests to check auth problems
  $(document).ajaxError((event, request, settings) => {
    if (request.status === 403 || request.status === 401 || request.status === 404) {
      dataInterface.selfProfile().done((data) => {
        if (data.message === 'user is not logged in') {
          let errorMessage = t('Please try reloading the page. If you need to contact support, note the following message: <pre>##server_message##</pre>');
          let serverMessage = request.status.toString();
          if (request.responseJSON && request.responseJSON.detail) {
            serverMessage += ': ' + request.responseJSON.detail;
          }
          errorMessage = errorMessage.replace('##server_message##', serverMessage);
          alertify.alert(t('You are not logged in'), errorMessage);
        }
      });
    }
  });

  assign(this, {
    selfProfile: ()=> $ajax({ url: `${ROOT_URL}/me/` }),
    serverEnvironment: ()=> $ajax({ url: `${ROOT_URL}/environment/` }),
    apiToken: () => {
      return $ajax({
        url: `${ROOT_URL}/token/?format=json`
      });
    },
    getUser: (userUrl) => {
      return $ajax({
        url: userUrl
      });
    },
    queryUserExistence: (username)=> {
      var d = new $.Deferred();
      $ajax({ url: `${ROOT_URL}/api/v2/users/${username}/` })
        .done(()=>{ d.resolve(username, true); })
        .fail(()=>{ d.reject(username, false); });
      return d.promise();
    },
    logout: ()=> {
      var d = new $.Deferred();
      $ajax({ url: `${ROOT_URL}/api-auth/logout/` }).done(d.resolve).fail(function (/*resp, etype, emessage*/) {
        // logout request wasn't successful, but may have logged the user out
        // querying '/me/' can confirm if we have logged out.
        dataInterface.selfProfile().done(function(data){
          if (data.message === 'user is not logged in') {
            d.resolve(data);
          } else {
            d.fail(data);
          }
        }).fail(d.fail);
      });
      return d.promise();
    },
    patchProfile (data) {
      return $ajax({
        url: `${ROOT_URL}/me/`,
        method: 'PATCH',
        data: data
      });
    },
    listTemplates () {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/?q=${COMMON_QUERIES.get('t')}`
      });
    },
    getCollections(params = {}) {
      let q = COMMON_QUERIES.get('c');
      if (params.owner) {
        q += ` AND owner__username__exact:${params.owner}`;
      }
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/`,
        dataType: 'json',
        data: {
          q: q,
          limit: params.pageSize || 100,
          page: params.page || 0
        },
        method: 'GET'
      });
    },
    createAssetSnapshot (data) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/asset_snapshots/`,
        method: 'POST',
        data: data
      });
    },
    createTemporaryAssetSnapshot ({source}) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/asset_snapshots/`,
        method: 'POST',
        data: {
          source: source
        }
      });
    },

    /*
     * external services
     */

    getHooks(uid) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/hooks/`,
        method: 'GET'
      });
    },
    getHook(uid, hookUid) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/hooks/${hookUid}/`,
        method: 'GET'
      });
    },
    addExternalService(uid, data) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/hooks/`,
        method: 'POST',
        data: JSON.stringify(data),
        dataType: 'json',
        contentType: 'application/json'
      });
    },
    updateExternalService(uid, hookUid, data) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/hooks/${hookUid}/`,
        method: 'PATCH',
        data: JSON.stringify(data),
        dataType: 'json',
        contentType: 'application/json'
      });
    },
    deleteExternalService(uid, hookUid) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/hooks/${hookUid}/`,
        method: 'DELETE'
      });
    },
    getHookLogs(uid, hookUid) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/hooks/${hookUid}/logs/`,
        method: 'GET'
      });
    },
    getHookLog(uid, hookUid, lid) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/hooks/${hookUid}/logs/${lid}/`,
        method: 'GET'
      });
    },
    retryExternalServiceLogs(uid, hookUid) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/hooks/${hookUid}/retry/`,
        method: 'PATCH'
      });
    },
    retryExternalServiceLog(uid, hookUid, lid) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/hooks/${hookUid}/logs/${lid}/retry/`,
        method: 'PATCH'
      });
    },

    getReportData (data) {
      let identifierString;
      if (data.identifiers) {
        identifierString = `?names=${data.identifiers.join(',')}`
      }
      if (data.group_by != '')
        identifierString += `&split_by=${data.group_by}`;

      return $ajax({
        url: `${ROOT_URL}/reports/${data.uid}/${identifierString}`,
      });
    },
    cloneAsset ({uid, name, version_id, new_asset_type, parent}) {
      let data = {
        clone_from: uid,
      };
      if (name) { data.name = name; }
      if (version_id) { data.clone_from_version_id = version_id; }
      if (new_asset_type) { data.asset_type = new_asset_type; }
      if (parent) { data.parent = parent; }
      return $ajax({
        method: 'POST',
        url: `${ROOT_URL}/api/v2/assets/`,
        data: data,
      });
    },

    /*
     * permissions
     */

    getPermissionsConfig() {
      return $ajax({
        url: `${ROOT_URL}/api/v2/permissions/`,
        method: 'GET'
      });
    },

    getAssetPermissions(assetUid) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${assetUid}/permission-assignments/`,
        method: 'GET'
      });
    },

    bulkSetAssetPermissions(assetUid, perms) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${assetUid}/permission-assignments/bulk/`,
        method: 'POST',
        data: JSON.stringify(perms),
        dataType: 'json',
        contentType: 'application/json'
      });
    },

    assignAssetPermission(assetUid, perm) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${assetUid}/permission-assignments/`,
        method: 'POST',
        data: JSON.stringify(perm),
        dataType: 'json',
        contentType: 'application/json'
      });
    },

    removePermission (permUrl) {
      return $ajax({
        method: 'DELETE',
        url: permUrl
      });
    },

    copyPermissionsFrom(sourceUid, targetUid) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${targetUid}/permission-assignments/clone/`,
        method: 'PATCH',
        data: {
          clone_from: sourceUid
        }
      });
    },
    deleteAsset ({uid}) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/`,
        method: 'DELETE'
      });
    },
    subscribeToCollection(assetUrl) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/asset_subscriptions/`,
        data: {
          asset: assetUrl
        },
        method: 'POST'
      });
    },
    unsubscribeFromCollection(uid) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/asset_subscriptions/`,
        data: {
          asset__uid: uid
        },
        method: 'GET'
      }).then((data) => {
        return $ajax({
          url: data.results[0].url,
          method: 'DELETE'
        });
      });
    },
    getAssetContent ({id}) {
      return $.getJSON(`${ROOT_URL}/api/v2/assets/${id}/content/`);
    },
    getImportDetails ({uid}) {
      return $.getJSON(`${ROOT_URL}/imports/${uid}/`);
    },
    getAsset (params={}) {
      if (params.url) {
        return $.getJSON(params.url);
      } else {
        return $.getJSON(`${ROOT_URL}/api/v2/assets/${params.id}/`);
      }
    },
    /**
     * @param {object} data
     * @param {string} [data.source]
     * @param {string} [data.type]
     * @param {boolean} [data.fields_from_all_versions]
     * @param {string} [data.lang]
     * @param {boolean} [data.hierarchy_in_labels]
     * @param {string} [data.group_sep]
     */
    createExport (data) {
      return $ajax({
        url: `${ROOT_URL}/exports/`,
        method: 'POST',
        data: data
      });
    },
    getAssetExports (uid) {
      return $ajax({
        url: `${ROOT_URL}/exports/`,
        data: {
          q: `source:${uid}`
        }
      });
    },
    deleteAssetExport (euid) {
      return $ajax({
        url: `${ROOT_URL}/exports/${euid}/`,
        method: 'DELETE'
      });
    },
    getAssetXformView (uid) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/xform/`,
        dataType: 'html'
      });
    },
    searchAssets(searchData) {
      // TODO https://github.com/kobotoolbox/kpi/issues/1983
      // force set limit to get hacky "all" assets
      searchData.limit = 200;
      return $.ajax({
        url: `${ROOT_URL}/api/v2/assets/`,
        dataType: 'json',
        data: searchData,
        method: 'GET'
      });
    },
    searchMyLibraryAssets(params = {}) {
      const searchData = {
        // we only want orphans (assets not inside collection)
        q: `${COMMON_QUERIES.get('qbtc')} AND parent__uid:null`,
        limit: params.pageSize || 100,
        offset: params.page * params.pageSize || 0
      };

      if (params.searchPhrase) {
        searchData.q += ` AND ${params.searchPhrase}`;
      }

      if (params.filterProperty && params.filterValue) {
        searchData.q += ` AND ${params.filterProperty}:${params.filterValue}`;
      }

      if (params.ordering) {
        searchData.ordering = params.ordering;
      }

      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/`,
        dataType: 'json',
        data: searchData,
        method: 'GET'
      });
    },
    searchPublicCollections(params = {}) {
      const searchData = {
        q: `${COMMON_QUERIES.get('c')} AND status:public-discoverable`,
        all_public: true,
        limit: params.pageSize || 100,
        offset: params.page * params.pageSize || 0
      };

      if (params.searchPhrase) {
        searchData.q += ` AND ${params.searchPhrase}`;
      }

      if (params.sort && params.order) {
        searchData.ordering = `${params.order}${params.sort}`;
      }

      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/`,
        dataType: 'json',
        data: searchData,
        method: 'GET'
      });
    },
    assetsHash () {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/hash/`,
        method: 'GET'
      });
    },
    createResource (details) {
      return $ajax({
        method: 'POST',
        url: `${ROOT_URL}/api/v2/assets/`,
        data: details
      });
    },
    patchAsset (uid, data) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/`,
        method: 'PATCH',
        data: data
      });
    },
    listTags (data) {
      return $ajax({
        url: `${ROOT_URL}/tags/`,
        method: 'GET',
        data: assign({
          limit: 9999,
        }, data),
      });
    },
    loadNextPageUrl(nextPageUrl){
      return $ajax({
        url: nextPageUrl,
        method: 'GET'
      });
    },
    deployAsset (asset, redeployment) {
      var data = {
        'active': true,
      };
      var method = 'POST';
      if (redeployment) {
        method = 'PATCH';
        data.version_id = asset.version_id;
      }
      return $ajax({
        method: method,
        url: `${asset.url}deployment/`,
        data: data
      });
    },
    setDeploymentActive ({asset, active}) {
      return $ajax({
        method: 'PATCH',
        url: `${asset.url}deployment/`,
        data: {
          active: active
        }
      });
    },
    postCreateImport (contents) {
      var formData = new FormData();
      Object.keys(contents).forEach(function(key){
        formData.append(key, contents[key]);
      });
      return $.ajax({
        method: 'POST',
        url: `${ROOT_URL}/imports/`,
        data: formData,
        processData: false,
        contentType: false
      });
    },
    getResource ({id}) {
      // how can we avoid pulling asset type from the 1st character of the uid?
      var assetType = assetMapping[id[0]];
      return $.getJSON(`${ROOT_URL}/${assetType}/${id}/`);
    },
    getSubmissions(uid, pageSize=100, page=0, sort=[], fields=[], filter='') {
      const query = `limit=${pageSize}&start=${page}`;
      var s = '&sort={"_id":-1}'; // default sort
      var f = '';
      if (sort.length)
        s = sort[0].desc === true ? `&sort={"${sort[0].id}":-1}` : `&sort={"${sort[0].id}":1}`;
      if (fields.length)
        f = `&fields=${JSON.stringify(fields)}`;

      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/data/?${query}${s}${f}${filter}`,
        method: 'GET'
      });
    },
    getSubmission(uid, sid) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/data/${sid}/`,
        method: 'GET'
      });
    },
    patchSubmissions(uid, data) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/data/validation_statuses/`,
        method: 'PATCH',
        data: {'payload': JSON.stringify(data)}
      });
    },
    bulkRemoveSubmissionsValidationStatus(uid, data) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/data/validation_statuses/`,
        method: 'DELETE',
        data: {'payload': JSON.stringify(data)}
      });
    },
    updateSubmissionValidationStatus(uid, sid, data) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/data/${sid}/validation_status/`,
        method: 'PATCH',
        data: data
      });
    },
    removeSubmissionValidationStatus(uid, sid) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/data/${sid}/validation_status/`,
        method: 'DELETE'
      });
    },
    getSubmissionsQuery(uid, query='') {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/data/?${query}`,
        method: 'GET'
      });
    },
    deleteSubmission(uid, sid) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/data/${sid}`,
        method: 'DELETE'
      });
    },
    bulkDeleteSubmissions(uid, data) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/data/bulk/`,
        method: 'DELETE',
        data: {'payload': JSON.stringify(data)}
      });
    },
    getEnketoEditLink(uid, sid) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/data/${sid}/edit/?return_url=false`,
        method: 'GET'
      });
    },
    uploadAssetFile(uid, data) {
      var formData = new FormData();
      Object.keys(data).forEach(function(key) {
        formData.append(key, data[key]);
      });

      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/files/`,
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false
      });
    },
    getAssetFiles(uid) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${uid}/files/`,
        method: 'GET'
      });
    },
    deleteAssetFile(assetUid, uid) {
      return $ajax({
        url: `${ROOT_URL}/api/v2/assets/${assetUid}/files/${uid}/`,
        method: 'DELETE'
      });
    },

    getHelpInAppMessages() {
      return $ajax({
        url: `${ROOT_URL}/help/in_app_messages/`,
        method: 'GET'
      });
    },
    patchHelpInAppMessage(uid, data) {
      return $ajax({
        url: `${ROOT_URL}/help/in_app_messages/${uid}/`,
        method: 'PATCH',
        data: JSON.stringify(data),
        dataType: 'json',
        contentType: 'application/json'
      });
    },

    setLanguage(data) {
      return $ajax({
        url: `${ROOT_URL}/i18n/setlang/`,
        method: 'POST',
        data: data
      });
    },
    environment() {
      return $ajax({url: `${ROOT_URL}/environment/`,method: 'GET'});
    },
    login: (creds)=> {
      return $ajax({ url: `${ROOT_URL}/api-auth/login/?next=/me/`, data: creds, method: 'POST'});
    }
  });
}).call(dataInterface = {});
