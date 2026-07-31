import pytest
from app.services.regex_engine import scan_content, calculate_entropy

def test_aws_access_key_detection():
    code = 'aws_key = "AKIAIOSFODNN7EXAMPLE"'
    results = scan_content(code)
    assert len(results) == 1
    assert results[0]["name"] == "AWS Access Key ID"
    assert results[0]["value"] == "AKIAIOSFODNN7EXAMPLE"
    assert results[0]["severity"] == "Critique"

def test_github_token_detection():
    code = 'const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";'
    results = scan_content(code)
    assert len(results) == 1
    assert results[0]["category"] == "API tokens"
    assert results[0]["value"] == "ghp_1234567890abcdefghijklmnopqrstuvwxyz"

def test_private_key_detection():
    code = """
    -----BEGIN RSA PRIVATE KEY-----
    MIIEowIBAAKCAQEA0yGz...
    -----END RSA PRIVATE KEY-----
    """
    results = scan_content(code)
    assert len(results) == 1
    assert results[0]["name"] == "Private Key Header"

def test_database_connection_string_detection():
    code = 'db_url = "postgresql://admin:superSecretPassword123@localhost:5432/mydb"'
    results = scan_content(code)
    assert len(results) == 1
    assert results[0]["name"] == "Database Connection String"
    assert "superSecretPassword123" in results[0]["value"]

def test_generic_password_detection():
    code = 'db_pass = "mySecret_123!"'
    results = scan_content(code)
    assert len(results) == 1
    assert results[0]["name"] == "Generic Password Assignment"
    assert results[0]["value"] == "mySecret_123!"

def test_no_secrets_detected_in_clean_code():
    code = """
    def add(a, b):
        return a + b
    
    # Just a normal comment
    password_field = document.getElementById("password")
    """
    results = scan_content(code)
    assert len(results) == 0

def test_entropy_of_empty_text():
    assert calculate_entropy("") == 0.0


def test_entropy_of_repeated_character():
    assert calculate_entropy("aaaa") == 0.0


def test_entropy_of_two_equally_likely_characters():
    assert calculate_entropy("ab") == pytest.approx(1.0)