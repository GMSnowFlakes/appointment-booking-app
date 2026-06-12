
        const path = require('path');
        process.env.DB_PATH = "C:\\Users\\marcp\\Downloads\\Freebuff\\Appointment-booking app\\server\\appointments.db";
        const { initDatabase, getDb, run } = require(path.resolve("C:\\Users\\marcp\\Downloads\\Freebuff\\Appointment-booking app\\server", 'db'));
        initDatabase().then(() => {
          run('UPDATE users SET role = ? WHERE email = ?', ['admin', "admin-1781198401740@e2e-test.com"]);
          console.log('PROMOTED');
          process.exit(0);
        }).catch(err => { console.error(err); process.exit(1); });
      