Line 1: # Cloud configuration for benchmark-repo
Line 2: import os
Line 3: 
Line 4: AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
Line 5: AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
Line 6: 
Line 7: GCP_SERVICE_ACCOUNT_KEY = "ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAibXktcHJvamVjdCIKfQ=="
Line 8: 
Line 9: DB_PASSWORD = "P@ssw0rd_Str0ng!2024"
Line 10: 
Line 11: BUILD_HASH = "f3a9c2e7b1d84a6f9c0e2b7a1d3f5e8c"
Line 12: REQUEST_ID = "550e8400-e29b-41d4-a716-446655440000"
Line 13: COLOR_CODE = "#a1b2c3"
Line 14: 
Line 15: def get_region():
Line 16:     return "us-east-1"