from fastapi.testclient import TestClient

from app.main import create_app


app = create_app()
client = TestClient(app)


def test_create_and_vote_flow():
	# create poll
	resp = client.post("/api/polls", json={"question": "Best fruit?", "options": ["Apple", "Banana", "Peach"]})
	assert resp.status_code == 200, resp.text
	code = resp.json()["code"]

	# get poll
	resp = client.get(f"/api/polls/{code}")
	assert resp.status_code == 200
	data = resp.json()
	assert data["question"] == "Best fruit?"
	option_id = data["options"][0]["id"]

	# vote
	resp = client.post(f"/api/polls/{code}/vote", json={"option_id": option_id})
	assert resp.status_code == 200
	assert resp.json()["status"] == "ok"

	# results
	resp = client.get(f"/p/{code}/results")
	assert resp.status_code == 200
	results = resp.json()
	assert results["total"] >= 1