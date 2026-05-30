import random
import csv

NUM_SAMPLES = 2000

themes = {
    "Web Development": {
        "keywords": ["html", "css", "javascript", "react", "api", "frontend", "backend", "node"],
        "sentences": [
            "building a website",
            "fixing frontend bugs",
            "working on a web app",
            "creating a responsive layout",
            "making a login system"
        ],
        "code": [
            "<div>Hello</div>",
            "console.log('hello')",
            "fetch('/api/data')",
            "function App() { return <h1>Hi</h1>; }",
            "document.getElementById('app')"
        ]
    },
    "Machine Learning": {
        "keywords": ["model", "training", "dataset", "neural network", "ai", "prediction", "accuracy"],
        "sentences": [
            "training a model",
            "analyzing data",
            "improving accuracy",
            "working on predictions",
            "testing a neural network"
        ],
        "code": [
            "model.fit(X, y)",
            "import sklearn",
            "loss.backward()",
            "predict(X_test)",
            "from tensorflow import keras"
        ]
    },
    "Databases": {
        "keywords": ["sql", "query", "table", "index", "database", "rows", "columns"],
        "sentences": [
            "writing SQL queries",
            "managing tables",
            "optimizing database",
            "fetching records",
            "handling data storage"
        ],
        "code": [
            "SELECT * FROM users;",
            "INSERT INTO users VALUES ('John');",
            "UPDATE users SET name='Alex';",
            "DELETE FROM users WHERE id=1;",
            "CREATE TABLE users(id INT);"
        ]
    }
}

# messy / human-like noise
NOISY_SENTENCES = [
    "uh fixing stuff",
    "idk doing coding",
    "working on something",
    "trying to fix bugs",
    "making something idk",
    "coding lang eh",
    "debugging rn"
]

GENERIC_KEYWORDS = ["code", "computer", "programming", "typing"]

GENERIC_CODE = [
    "print('hello')",
    "console.log('test')",
    "int a = 5;",
    "echo 'hi';"
]


def maybe_noise(text_list):
    if random.random() < 0.2:
        return random.choice(NOISY_SENTENCES)
    return random.choice(text_list)


def maybe_empty(value):
    return value if random.random() > 0.1 else ""


def generate_correct(theme_name):
    theme = themes[theme_name]

    sentence = maybe_noise(theme["sentences"])
    keywords = ", ".join(random.sample(theme["keywords"], k=random.randint(2, 4)))
    code = random.choice(theme["code"])

    return maybe_empty(sentence), maybe_empty(keywords), maybe_empty(code), theme_name, 1


def generate_incorrect(theme_name):
    other = random.choice([t for t in themes if t != theme_name])
    theme = themes[other]

    sentence = maybe_noise(theme["sentences"])
    keywords = ", ".join(random.sample(theme["keywords"], k=random.randint(2, 4)))
    code = random.choice(theme["code"])

    return maybe_empty(sentence), maybe_empty(keywords), maybe_empty(code), theme_name, 0


def generate_mixed(theme_name):
    theme = themes[theme_name]
    other = random.choice([t for t in themes if t != theme_name])

    sentence = maybe_noise(theme["sentences"])
    keywords = ", ".join(
        random.sample(theme["keywords"], k=2) +
        random.sample(themes[other]["keywords"], k=1)
    )
    code = random.choice(themes[other]["code"])

    return maybe_empty(sentence), maybe_empty(keywords), maybe_empty(code), theme_name, 0


def generate_generic_impostor(theme_name):
    sentence = random.choice(NOISY_SENTENCES)
    keywords = ", ".join(random.sample(GENERIC_KEYWORDS, k=2))
    code = random.choice(GENERIC_CODE)

    return sentence, keywords, code, theme_name, 0


def main():
    dataset = []

    for _ in range(NUM_SAMPLES):
        theme = random.choice(list(themes.keys()))

        choice = random.choices(
            ["correct", "incorrect", "mixed", "generic"],
            weights=[0.4, 0.2, 0.25, 0.15]
        )[0]

        if choice == "correct":
            row = generate_correct(theme)
        elif choice == "incorrect":
            row = generate_incorrect(theme)
        elif choice == "mixed":
            row = generate_mixed(theme)
        else:
            row = generate_generic_impostor(theme)

        dataset.append(row)

    random.shuffle(dataset)

    with open("dataset.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["sentence", "keywords", "code", "theme", "label"])
        writer.writerows(dataset)

    print(f"Generated {len(dataset)} samples!")


if __name__ == "__main__":
    main()