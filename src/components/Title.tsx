import { Box, Typography } from "@mui/material";

interface TitleProps {
  title: string;
  subtitle: string;
}

export default function Title({ title, subtitle }: TitleProps) {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, color: "primary.main", ml:{xs: 5, sm:5, md:0} }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </Box>
  );
}
