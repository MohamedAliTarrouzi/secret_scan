Line 1: """Authentication module for benchmark-repo"""
Line 2: import jwt
Line 3: 
Line 4: RSA_PRIVATE_KEY = """-----BEGIN RSA PRIVATE KEY-----
Line 5: MIIEpAIBAAKCAQEA1c7+9z5Fp0jXn3vM8kLq2wRt6yUiOaGbHcVdSfEjKlMnOpQr
Line 6: StUvWxYz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrst
Line 7: uvwxyz0123456789+/AbCdEfGhIjKlMnOpQrStUvWxYz1234567890ABCDEFGHIJ
Line 8: KLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/ABCDEFGHIJ
Line 9: -----END RSA PRIVATE KEY-----"""
Line 10: 
Line 11: JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"
Line 12: 
Line 13: secret = "sk_test_gen_7f3a9c2e8b1d4f6a9c0e2b7a1d3f5e8c9a0b1c2d"
Line 14: 
Line 15: LOG_TRACE_ID = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"
Line 16: 
Line 17: def verify_password(password_input, stored_hash):
Line 18:     return password_input == stored_hash
Line 19: 
Line 20: DEBUG_MODE = False