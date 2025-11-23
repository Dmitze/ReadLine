# Додавання книги: логіка сцен і кнопок

Цей документ описує повний функціонал сцени додавання книги: кроки, callback-ключі, зміни стану, та обробка «Тільки фізична».

## Основні файли

- `src/scenes/addBookScene.ts` — основна Wizard-сцена з кроками.
- `src/scenes/addBook/utils.ts` — допоміжні утиліти та UI:
  - `getProgress()` — прогресбар.
  - `examples` — підказки.
  - `popularGenres`, `otherGenres` — списки жанрів.
  - `showFormatSelection()` — кнопки вибору типу книги.
  - `proceedToTags()` — перехід до тегів.
  - `showBookPreview()` — попередній перегляд перед публікацією.
  - `handleFileUpload()` — обгортка завантаження файлів з логуванням.

## Кроки Wizard-сцени `ADD_BOOK_SCENE` (`src/scenes/addBookScene.ts`)

1) Назва книги
- Ввід текстом, валідація довжини (`VALIDATION.TITLE_MIN/MAX`).
- Зберігається у `state.title`.

2) Автор
- Ввід текстом, валідація довжини (`VALIDATION.AUTHOR_MIN`).
- Зберігається у `state.author`.

3) Жанри
- Показ популярних жанрів та кнопка «Всі жанри».
- Колбек-дані: `genre_popular_{idx}` або `genre_all_{idx}`.
- Обрані жанри у `state.selectedGenres`, з обмеженням до 5.
- Після `genres_done` — `state.genre = state.selectedGenres.join(', ')`.

4) Опис
- Ввід текстом з валідацією (`VALIDATION.DESCRIPTION_MIN/MAX`).
- Зберігається у `state.description`.

5) Фото обкладинки
- Можна завантажити або натиснути «⏭️ Пропустити» (`skip_photo`).
- `state.photoFileId` зберігає file_id або `default_book_cover`.

6) Тип книги (формати)
- Виклик `showFormatSelection()` показує інлайн-клавіатуру:
  - `type_file` — Файл (PDF/EPUB/FB2)
  - `type_audio` — Аудіокнига
  - `type_link` — Онлайн-посилання
  - `type_physical` — Тільки фізична
- Обробка в сцені:
  - `type_file` → запит «📎 Надішліть файл книги». Далі перехід на крок 7 (завантаження).
  - `type_audio` → запит «🎧 Надішліть аудіофайл книги». Далі крок 7.
  - `type_link` → запит «🔗 Введіть посилання на книгу». Далі крок 7 (береться текст).
  - `type_physical` → НОВЕ: пропускаємо крок 7, одразу `proceedToTags()` і `ctx.wizard.selectStep(8)`.

7) Завантаження/ввід формату
- Залежно від `state.bookType` обробляються:
  - Документ (`document`) → `state.bookFile`, `state.bookFileName`.
  - Аудіо (`audio` або `voice`) → `state.bookAudio`, `state.bookAudioName`.
  - Посилання (`text`) → `state.bookLink`.
- Після успішного завантаження/вводу:
  - Якщо це додатковий формат (`state.addingAdditionalFormat = true`) — повернення до `showFormatSelection()`.
  - Інакше — `showFormatSelection()` для можливості додати ще, потім перехід на крок 8.

8) Теги
- Клавіатура тегів із кешу (`getCachedTags()`), callback `tag_{id}` для toggle.
- Кнопка «✅ Далі» → `preview_skip_tags` може одразу перейти на наступний крок.

9) Фізична наявність
- Кнопки:
  - `book_physical_yes` → `state.is_physically_available = true`.
  - `book_physical_no` → `state.is_physically_available = false`.
- Після вибору — показ фінального прев’ю (`showFinalPreview()`) і перехід на крок 10.

10) Підтвердження
- Кнопки:
  - `confirm_book` — валідація даних, `addBook()`, додавання тегів, формування підпису через `formatBookCaption()`, публікація повідомлення.
  - `cancel_book` — вихід зі сцени.

## Callback-ключі (зведення)

- Жанри: `genre_popular_{idx}`, `genre_all_{idx}`, `genres_done`.
- Фото: `skip_photo`.
- Тип книги: `type_file`, `type_audio`, `type_link`, `type_physical`.
- Додаткові формати: `add_more_file`, `add_more_audio`, `add_more_link`, `skip_more_formats`.
- Теги: `tag_{id}`, `preview_skip_tags`.
- Фізична наявність: `book_physical_yes`, `book_physical_no`.
- Прев’ю/публікація: `confirm_book`, `cancel_book` + кнопки редагування: `edit_title`, `edit_author`, `edit_description`, `edit_photo`, `edit_formats`.

## Логіка «Тільки фізична» (важливо)

- Кнопка в `showFormatSelection()` відправляє `type_physical`.
- Обробка в кроці 6 (`addBookScene.ts`):
  - Відповідь через `ctx.answerCbQuery()`.
  - `state.addingAdditionalFormat = false` (на всякий випадок).
  - `ctx.editMessageText('...тільки фізична...')` для відмітки вибору.
  - Виклик `proceedToTags(ctx)` і `ctx.wizard.selectStep(8)` — одразу до тегів.
- Таким чином, ніякого «зависання»: ми не просимо нічого завантажувати/вводити, а рухаємось далі.

## Формування фінального підпису

- `formatBookCaption(book: Book)` у `src/utils/helpers.ts` — формує HTML-caption, підтягує теги (якщо їх не передано), показує формати, фізичну доступність та інші деталі. Викликається після збереження книги (`confirm_book`).

## Валідація та помилки

- Валідація на кожному кроці: якщо формат/тип/ввід не коректні — відповідаємо підказкою і не рухаємось далі.
- Завантаження файлів обгорнуте у `handleFileUpload()`: логуються помилки, юзеру показується зрозуміле повідомлення.

## Поради по UX

- Для мінімізації кроків:
  - Якщо не потрібні електронні формати — обирайте «📚 Тільки фізична», і ви пропустите завантаження.
  - Теги опціональні; «✅ Далі» дозволяє перейти без них.

## Зміни, зроблені для виправлення «зависання»

- Вирівняно callback-ключі між `showFormatSelection()` і обробником у сцені:
  - Було: `format_*`, стало: `type_*`.
  - Додано підтримку `type_physical` у кроці 6 з пропуском кроку 7.

## Де шукати в коді

- Вибір типу книги (крок 6): `src/scenes/addBookScene.ts`, блок із перевіркою `type_*`.
- Кнопки для вибору типу: `src/scenes/addBook/utils.ts`, `showFormatSelection()`.
- Перехід до тегів: `src/scenes/addBook/utils.ts`, `proceedToTags()`.
- Попередній перегляд: `src/scenes/addBook/utils.ts`, `showBookPreview()`.
- Фінальна публікація: `src/scenes/addBookScene.ts`, action `confirm_book`.
