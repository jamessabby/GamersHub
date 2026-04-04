const tournamentService = require("./tournament.service");

async function listTournaments(req, res) {
  try {
    const tournaments = await tournamentService.listTournaments();
    res.status(200).json(tournaments);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load tournaments." });
  }
}

module.exports = {
  listTournaments,
};
