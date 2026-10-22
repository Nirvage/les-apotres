function showGameMasterSpaceIfAllowed() {
  const allowed = isGameMasterActive();
  $('#lock').hidden = allowed;
  $('#mj').hidden = !allowed;
}

Persos.init({
  part: 'espacemj', mount: $('#persos'), msg: showMessage,
  collect: () => null, apply: showGameMasterSpaceIfAllowed, onName: showGameMasterSpaceIfAllowed
});
