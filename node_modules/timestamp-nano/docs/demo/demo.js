// demo.js

$(function() {
  $(window).on("hashchange", init);

  $("a.btn").on("click", onClickBtn);

  var $format = $("#format").on("change keyup", onChangeFormat);
  var $json = $("#json").on("change keyup", onChangeJSON);
  var $time = $("#time").on("change keyup", onChangeTime);
  var $hex = $("#hex").on("change keyup", onChangeHex);
  var $nano = $("#nano").on("change keyup", onChangeNano);

  var $_year = $("#_year");
  var $_time = $("#_time");
  var $_nano = $("#_nano");

  $format.on("dblclick", toggleFormat);
  $(".mod-btn").on("click", onClickMod);

  var ts = Timestamp.fromDate();
  var buffer = new Array(8);

  init();

  function init() {
    applyHash(location.hash);
  }

  function applyHash(hash) {
    var query = hash && qs.parse(hash.substr(3));
    $nano.val(0);
    var c = 0;

    if (query.format) {
      $format.val(query.format).trigger("change");
      c++;
    }
    if (query.json) {
      $json.val(query.json).trigger("change");
      c++;
    }
    if (query.time) {
      $time.val(query.time).trigger("change");
      c++;
    }
    if (query.hex) {
      $hex.val(query.hex).trigger("change");
      c++;
    }
    if (query.nano) {
      $nano.val(query.nano).trigger("change");
      c++;
    }
    if (!c) {
      var now = new Date();
      $nano.val((now % 1000) * 1000 * 1000);
      $time.val(Math.floor(now / 1000)).trigger("change");
    }

    update();
  }

  function toggleFormat() {
    $format.prop("readonly", !$format.prop("readonly"));
  }

  function onClickMod() {
    var nano = +$(this).data("nano");
    ts.addNano(nano);
    update();
  }

  function onClickBtn() {
    var href = $(this).attr("href");
    if (href[0] !== "#") return true;
    applyHash(href);
  }

  function update(src) {
    ts.writeInt64BE(buffer);

    // normalized
    if (src !== $json) $json.val(ts.toString($format.val()));
    if (src !== $time) $time.val(Int64BE(buffer).toString(10));
    if (src !== $hex) $hex.val(buffer.map(padHEX).join(" ").toUpperCase());
    if (src !== $nano) $nano.val(ts.getNano());

    // internal value
    $_year.val(ts.year);
    $_time.val(ts.time);
    $_nano.val(ts.nano);
  }

  function padHEX(v) {
    return (v > 15 ? "" : "0") + (v | 0).toString(16);
  }

  function onChangeFormat() {
    update($format);
  }

  function onChangeTime() {
    Int64BE(buffer, 0, $time.val().replace(/[^\w\-]+/g, ""), 10);
    ts = Timestamp.fromInt64BE(buffer).addNano($nano.val());
    update($time);
  }

  function onChangeHex() {
    Int64BE(buffer, 0, $hex.val().replace(/[^\w\-]+/g, ""), 16);
    ts = Timestamp.fromInt64BE(buffer).addNano($nano.val());
    update($hex);
  }

  function onChangeJSON() {
    ts = Timestamp.fromString($json.val());
    update($json);
  }

  function onChangeNano() {
    ts.addNano(+$nano.val() - ts.getNano());
    update($nano);
  }
});