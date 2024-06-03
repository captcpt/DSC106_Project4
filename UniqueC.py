import pandas as pd
import json

# Load the CSV file
file_path = 'ELECSTAT.csv'
df = pd.read_csv(file_path)

# Get unique country names
unique_countries = df['Country/area'].unique().tolist()

# Save the unique country names to a JSON file
output_path = 'unique_countries.json'
with open(output_path, 'w') as json_file:
    json.dump(unique_countries, json_file)

print(f"Unique countries saved to {output_path}")