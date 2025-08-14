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

	# ETag revalidation
	etag = resp.headers.get("ETag")
	assert etag
	resp2 = client.get(f"/p/{code}/results", headers={"If-None-Match": etag})
	assert resp2.status_code == 304

	# CSV export
	csv_resp = client.get(f"/p/{code}/export.csv")
	assert csv_resp.status_code == 200
	assert csv_resp.headers.get("Content-Type").startswith("text/csv")
	assert "option_id,option_text,count" in csv_resp.text

	# embed page available
	embed_resp = client.get(f"/e/{code}")
	assert embed_resp.status_code == 200
	assert "<iframe" not in embed_resp.text

	# oEmbed
	root = str(client.base_url).rstrip('/')
	oembed_resp = client.get("/oembed", params={"url": f"{root}/p/{code}", "maxwidth": 400, "maxheight": 240})
	assert oembed_resp.status_code == 200
	j = oembed_resp.json()
	assert j["type"] == "rich"
	assert "<iframe" in j["html"]