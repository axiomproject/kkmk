-- Check if feedback exists in the database
SELECT 
    ef.id,
    ef.event_id,
    e.title as event_title,
    u.name as user_name,
    ef.rating,
    ef.comment,
    ef.created_at
FROM event_feedback ef
JOIN users u ON ef.user_id = u.id
JOIN events e ON ef.event_id = e.id
ORDER BY ef.created_at DESC;

-- Count feedback per event
SELECT 
    e.id as event_id,
    e.title,
    COUNT(ef.id) as feedback_count
FROM events e
LEFT JOIN event_feedback ef ON e.id = ef.event_id
WHERE e.date < CURRENT_DATE  -- Only past events
GROUP BY e.id, e.title
ORDER BY feedback_count DESC;

-- Check events marked as past
SELECT 
    id, 
    title, 
    date, 
    CURRENT_DATE as today,
    date < CURRENT_DATE as is_past
FROM events
ORDER BY date DESC;
