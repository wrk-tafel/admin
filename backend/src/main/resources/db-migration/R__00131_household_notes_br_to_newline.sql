-- A note is plain text: every screen renders it interpolated, with typed newlines kept as line
-- breaks, so a tag inside it is shown as the characters it consists of. Rows that hold a line break
-- as a literal <br/> tag instead of a newline therefore show that tag in the customer detail screen,
-- the Notizen tab and the check-in panel, and again in the edit dialog's text field.
--
-- So every such tag (<br>, <br/>, <br />, in any case) becomes the newline it stands for. Re-running
-- it changes nothing, since no row matches afterwards.
update household_notes
set note = regexp_replace(note, '<br\s*/?>', E'\n', 'gi')
where note ~* '<br\s*/?>';
