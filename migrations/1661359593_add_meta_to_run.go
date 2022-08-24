package migrations

import (
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/daos"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/models/schema"
)

func init() {
	m.Register(func(db dbx.Builder) error {
		dao := daos.New(db)

		c, err := dao.FindCollectionByNameOrId("runs")
		if err != nil {
			return err
		}
		c.Schema.AddField(&schema.SchemaField{
			Name:    "comment",
			Type:    schema.FieldTypeText,
			Options: &schema.TextOptions{},
		})

		return dao.SaveCollection(c)
	}, func(db dbx.Builder) error {
		dao := daos.New(db)

		c, err := dao.FindCollectionByNameOrId("runs")
		if err != nil {
			return err
		}

		f := c.Schema.GetFieldByName("comment")
		c.Schema.RemoveField(f.Id)

		return dao.SaveCollection(c)
	}, "migrations/1661359593_add_meta_to_run.go")
}
