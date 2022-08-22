package archive

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/mholt/archiver/v4"
)

func Unpack(ctx context.Context, sourceFile string, targetPath string) error {
	source, err := os.Open(sourceFile)
	if err != nil {
		return err
	}
	defer source.Close()
	sourceName := filepath.Base(sourceFile)
	format, reader, err := archiver.Identify(sourceName, source)
	if err != nil {
		return err
	}

	err = format.(archiver.Extractor).Extract(ctx, reader, nil, func(ctx context.Context, f archiver.File) error {
		if strings.Contains(f.NameInArchive, "__MACOSX") {
			return nil
		}

		wp := filepath.Join(targetPath, f.NameInArchive)

		if f.IsDir() {
			if err := os.MkdirAll(wp, os.ModePerm); err != nil {
				return err
			}
			return nil
		}

		rc, err := f.Open()
		if err != nil {
			return err
		}
		defer rc.Close()

		wf, err := os.Create(wp)
		if err != nil {
			return err
		}
		defer wf.Close()

		if _, err := io.Copy(wf, rc); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return err
	}
	return nil
}
