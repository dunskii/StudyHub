"""Script to create the StudyHub test database."""
import asyncio
import asyncpg


async def create_test_database():
    """Create the studyhub_test database if it doesn't exist."""
    # Connect to the default postgres database
    conn = await asyncpg.connect(
        host="localhost",
        port=5433,
        user="postgres",
        password="Pr0phet5",
        database="postgres",
    )

    try:
        # Check if database exists
        result = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = 'studyhub_test'"
        )

        if result:
            print("Database 'studyhub_test' already exists.")
        else:
            # Create the database
            await conn.execute("CREATE DATABASE studyhub_test")
            print("Database 'studyhub_test' created successfully.")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(create_test_database())
